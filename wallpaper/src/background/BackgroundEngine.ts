import { accentEffects, type SongAccent } from './SongAccents';
import * as THREE from 'three';
import type { Config } from '../core/Config';
import type { AudioEngine } from '../audio/AudioEngine';
import fragmentShader from './environment.frag?raw';
import { effectTypes, themes, type ThemeId } from './Themes';
import { ThemeTransition } from './Transition';
import { performancePresets } from './Performance';
import { ParticleMotion } from './ParticleMotion';

const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// A slower atmosphere envelope leaves the TV's analyser responsive without snapping the particles.
const soften = (current: number, target: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-dt / (target > current ? .35 : .95)));
const gentleLevel = (value: number, strength: number): number => .55 * Math.tanh(Math.max(0, value) * strength * 4);
// Literal IDs let shader compilers discard the other effect branches at each call.
// Dynamic IDs inside loops make software WebGL evaluate an expensive dispatch per pixel.
const environmentShader = fragmentShader
  .replace('__THEME_LAYERS__', themes.map((_, i) => `if(weights[${i}]>.0001) c+=environment(${i},p,time)*weights[${i}];`).join('\n'))
  .replace('__SONG_LAYERS__', accentEffects.slice(1).map((_, index) => {
    const i = index + 1;
    return `if(songWeights[${i}]>.0001) song+=songAccent(${i},p,songTime)*songWeights[${i}];`;
  }).join('\n'));
const particleVertex = `
  uniform float time, size; uniform vec3 bands;
  attribute float seed; attribute vec4 shapeA; attribute vec2 shapeB;
  varying float alpha; varying float twinkle; varying vec4 effectA; varying vec2 effectB;
  void main(){
    effectA=shapeA; effectB=shapeB;
    float depth=.25+position.z*.75;
    gl_Position=vec4(position.xy,0.,1.); gl_PointSize=size*(.6+depth)*(1.+bands.x*.65+bands.z*.85)*(1.+shapeB.x*1.8);
    twinkle=.5+.5*sin(time*(.4+seed*.5)+seed*40.);
    alpha=depth*(.3+.3*twinkle)*(1.-smoothstep(.78,1.,max(abs(position.x),abs(position.y))));
  }`;
const particleFragment = `
  uniform vec3 color; uniform float opacity; varying float alpha; varying float twinkle; varying vec4 effectA; varying vec2 effectB;
  void main(){
    vec2 p=gl_PointCoord-.5; float r=length(p);
    float dust=exp(-r*r*25.)*(1.-smoothstep(.3,.5,r));
    float core=exp(-r*r*160.);
    float star=(exp(-abs(p.x)*85.-abs(p.y)*9.)+exp(-abs(p.y)*85.-abs(p.x)*9.))*.45;
    float sparkle=(core+star*twinkle)*(1.-smoothstep(.3,.5,r));
    float ember=exp(-dot(p*vec2(1.8,.8),p*vec2(1.8,.8))*50.);
    float rain=exp(-abs(p.x)*90.)*(1.-smoothstep(-.3,.5,p.y))*(1.-smoothstep(.3,.5,r));
    float bokeh=exp(-pow((r-.28)*14.,2.))*.18+exp(-r*r*12.)*.06;
    float firefly=(core+exp(-r*r*28.)*.3)*(.35+.65*twinkle);
    float a=dot(vec4(dust,sparkle,ember,rain),effectA)+dot(vec2(bokeh,firefly),effectB);
    vec3 tint=mix(color,vec3(1.,.4,.13),effectA.z*.55); tint=mix(tint,vec3(.8,1.,.45),effectB.y*.3);
    gl_FragColor=vec4(tint,a*alpha*opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** One quad + one fixed point geometry in the TV's renderer. Theme changes allocate no GPU resources. */
export class BackgroundEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  readonly transition = new ThemeTransition(themes.length);
  private time = 0;
  private songTime = 0;
  private motion = new ParticleMotion();
  private effectTarget = new Float32Array(6);
  private effectMix = new Float32Array([.25, .6, .15, 0, 0, 0]);
  private accents = new ThemeTransition(accentEffects.length);
  private material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader: `#define THEME_COUNT ${themes.length}\n#define SONG_EFFECT_COUNT ${accentEffects.length}\n${environmentShader}`, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      time: { value: 0 }, songTime: { value: 0 }, weights: { value: this.transition.weights }, songWeights: { value: this.accents.weights }, resolution: { value: new THREE.Vector2(1, 1) },
      primaryColor: { value: new THREE.Color() }, accentColor: { value: new THREE.Color() },
      bands: { value: new THREE.Vector3() }, amplitude: { value: 0 }, onset: { value: 0 }, intensity: { value: 1 }, glow: { value: 1 }, analog: { value: 1 }, brightness: { value: 1 }, lyrics: { value: 0 },
    },
  });
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
  private particleMaterial = new THREE.ShaderMaterial({
    vertexShader: `#define THEME_COUNT ${themes.length}\n${particleVertex}`, fragmentShader: `#define THEME_COUNT ${themes.length}\n${particleFragment}`, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, size: { value: 3 }, bands: { value: this.material.uniforms.bands.value }, color: { value: new THREE.Color() }, opacity: { value: 1 } },
  });
  private particles: THREE.Points;
  private highlight = new THREE.Color(0xffffff);
  private effectProfiles = themes.map(theme => effectTypes.map(type => (theme.effects as Partial<Record<typeof effectTypes[number], number>>)[type] || 0));
  constructor() {
    this.quad.frustumCulled = false; this.quad.renderOrder = -2; this.scene.add(this.quad);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.motion.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('seed', new THREE.BufferAttribute(this.motion.seeds, 1));
    geometry.setAttribute('shapeA', new THREE.BufferAttribute(this.motion.shapeA, 4).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('shapeB', new THREE.BufferAttribute(this.motion.shapeB, 2).setUsage(THREE.DynamicDrawUsage));
    this.particles = new THREE.Points(geometry, this.particleMaterial); this.particles.frustumCulled = false; this.particles.renderOrder = -1; this.scene.add(this.particles);
  }
  render(renderer: THREE.WebGLRenderer, dt: number, config: Config, audio: AudioEngine, theme: ThemeId, reduced: boolean, lyrics: boolean, palette: readonly string[], powered: boolean, accent: SongAccent | null = null, replaced = false): void {
    const index = themes.findIndex(entry => entry.id === theme);
    this.transition.select(index); this.transition.tick(dt, config.transitionDuration, reduced || !config.backgroundAnimation);
    this.accents.select(accent && config.songAccents && !replaced ? accentEffects.indexOf(accent.effect) : 0);
    this.accents.tick(dt, Math.min(1, config.transitionDuration), reduced || !config.backgroundAnimation);
    const moving = config.backgroundAnimation && !reduced;
    let speed = 0;
    for (let i = 0; i < themes.length; i++) speed += themes[i].speed * this.transition.weights[i];
    if (moving) {
      this.time += dt * speed * config.backgroundIntensity;
      // Secret animations keep a useful cadence even with a slow ambient/classical genre.
      this.songTime += dt * config.backgroundIntensity;
    }
    const u = this.material.uniforms;
    u.time.value = this.time;
    u.songTime.value = this.songTime;
    const strength = moving && powered ? config.reactivity : 0;
    if (strength > 0) {
      const step = Math.max(0, Math.min(.1, dt));
      u.bands.value.set(
        soften(u.bands.value.x, gentleLevel(audio.bass, strength), step),
        soften(u.bands.value.y, gentleLevel(audio.mid, strength), step),
        soften(u.bands.value.z, gentleLevel(audio.treble, strength), step),
      );
      u.onset.value = soften(u.onset.value, .18 * Math.tanh(Math.max(0, audio.transient) * strength), step);
    } else { u.bands.value.set(0, 0, 0); u.onset.value = 0; }
    u.amplitude.value = (u.bands.value.x * 16 + u.bands.value.y * 56 + u.bands.value.z * 56) / 128;
    u.intensity.value = moving ? config.backgroundIntensity : 0; u.glow.value = config.backgroundGlow; u.analog.value = config.analogIntensity;
    u.brightness.value = config.backgroundBrightness; u.lyrics.value = lyrics ? 1 : 0;
    renderer.getDrawingBufferSize(u.resolution.value);
    // The existing CSS cover gradient is the backdrop. Genre selection never supplies a palette.
    u.primaryColor.value.set(palette[0] || '#66583f').lerp(this.highlight, .35);
    u.accentColor.value.set(palette[1] || '#31473c').lerp(this.highlight, .3);
    this.effectTarget.fill(0);
    if (config.particleStyle === 'auto') {
      for (let i = 0; i < themes.length; i++) for (let j = 0; j < effectTypes.length; j++) this.effectTarget[j] += this.effectProfiles[i][j] * this.transition.weights[i];
    } else this.effectTarget[effectTypes.indexOf(config.particleStyle)] = 1;
    const blend = reduced || !moving ? 1 : 1 - Math.exp(-dt * 5 / config.transitionDuration);
    for (let i = 0; i < effectTypes.length; i++) this.effectMix[i] += (this.effectTarget[i] - this.effectMix[i]) * blend;
    const p = this.particleMaterial.uniforms; p.time.value = this.time;
    p.color.value.copy(u.accentColor.value); p.size.value = (4 + config.backgroundGlow * 4) * config.particleScale * renderer.getPixelRatio();
    p.opacity.value = config.backgroundBrightness * (lyrics ? .45 : 1) * (1 + u.amplitude.value * 1.5);
    this.particles.visible = config.particles && moving && config.particleDensity > 0;
    const count = Math.round(performancePresets[config.lowPower ? 'low' : config.performancePreset].particles * config.particleDensity);
    this.particles.geometry.setDrawRange(0, count);
    if (this.particles.visible) {
      this.motion.tick(dt, this.effectMix, this.transition.weights[1], Math.max(u.bands.value.x, u.amplitude.value),
        u.resolution.value.x / Math.max(1, u.resolution.value.y), count, config.backgroundIntensity * config.particleMotion * (.55 + speed * .45));
      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.geometry.attributes.shapeA.needsUpdate = true;
      this.particles.geometry.attributes.shapeB.needsUpdate = true;
    }
    if (!replaced) renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.quad.geometry.dispose(); this.material.dispose(); this.particles.geometry.dispose(); this.particleMaterial.dispose(); this.scene.clear();
  }
}
