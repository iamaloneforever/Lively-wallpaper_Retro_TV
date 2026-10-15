import { accentEffects, type SongAccent } from './SongAccents';
import * as THREE from 'three';
import type { Config } from '../core/Config';
import type { AudioEngine } from '../audio/AudioEngine';
import fragmentShader from './environment.frag?raw';
import { effectTypes, themes, type ThemeId } from './Themes';
import { ThemeTransition } from './Transition';
import { performancePresets } from './Performance';

const vertexShader = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// Literal IDs let shader compilers discard the other effect branches at each call.
// Dynamic IDs inside loops make software WebGL evaluate an expensive dispatch per pixel.
const environmentShader = fragmentShader
  .replace('__THEME_LAYERS__', themes.map((_, i) => `if(weights[${i}]>.0001) c+=environment(${i},p,time)*weights[${i}];`).join('\n'))
  .replace('__SONG_LAYERS__', accentEffects.slice(1).map((_, index) => {
    const i = index + 1;
    return `if(songWeights[${i}]>.0001) song+=songAccent(${i},p,songTime)*songWeights[${i}];`;
  }).join('\n'));
const particleVertex = `
  uniform float time, size, aspect, intensity, orbit; uniform vec3 bands; uniform float effectWeights[6];
  attribute float seed; varying float alpha; varying float twinkle; varying vec4 effectA; varying vec2 effectB;
  void main(){
    float t=time*(.025+seed*.025), choice=fract(seed*73.19), total=0., norm=0.;
    float mask[6];
    for(int i=0;i<6;i++) {
      mask[i]=(smoothstep(total-.015,total+.015,choice)-smoothstep(total+effectWeights[i]-.015,total+effectWeights[i]+.015,choice));
      total+=effectWeights[i]; norm+=mask[i];
    }
    for(int i=0;i<6;i++) mask[i]/=max(norm,.001);
    effectA=vec4(mask[0],mask[1],mask[2],mask[3]); effectB=vec2(mask[4],mask[5]);
    vec2 dust=vec2(fract(position.x+t*.12)*2.-1.,fract(position.y+t*.16)*2.-1.);
    vec2 spiral=vec2(cos(t*2.+seed*30.)/aspect,sin(t*2.+seed*30.))*(.2+position.x);
    vec2 sparkle=mix(dust,spiral,orbit*.35);
    vec2 ember=vec2(position.x*2.-1.+sin(t+seed*10.)*.06,fract(position.y+t*(.8+bands.x*.4))*2.-1.);
    vec2 rain=vec2(fract(position.x-t*.12)*2.-1.,1.-fract(position.y+t*1.3)*2.);
    vec2 firefly=dust+vec2(sin(t*2.+seed*20.)/aspect,cos(t*1.3+seed*13.))*.08;
    vec2 p=dust*(mask[0]+mask[4])+sparkle*mask[1]+ember*mask[2]+rain*mask[3]+firefly*mask[5];
    float depth=.25+position.z*.75;
    p.x+=sin(time*.12+seed*30.)*.018*intensity/aspect;
    gl_Position=vec4(p,0.,1.); gl_PointSize=size*(.6+depth)*(1.+bands.z*.3)*(1.+mask[4]*1.8);
    twinkle=.5+.5*sin(time*(.4+seed*.5)+seed*40.);
    alpha=depth*(.3+.3*twinkle)*(1.-smoothstep(.85,1.,max(abs(p.x),abs(p.y))));
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

/** One quad + one fixed particle buffer in the TV's renderer. Theme changes allocate nothing. */
export class BackgroundEngine {
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  readonly transition = new ThemeTransition(themes.length);
  private time = 0;
  private songTime = 0;
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
    uniforms: { time: { value: 0 }, effectWeights: { value: this.effectMix }, orbit: { value: 0 }, size: { value: 3 }, aspect: { value: 1 }, intensity: { value: 1 }, bands: { value: this.material.uniforms.bands.value }, color: { value: new THREE.Color() }, opacity: { value: 1 } },
  });
  private particles: THREE.Points;
  private highlight = new THREE.Color(0xffffff);
  private effectProfiles = themes.map(theme => effectTypes.map(type => (theme.effects as Partial<Record<typeof effectTypes[number], number>>)[type] || 0));
  constructor() {
    this.quad.frustumCulled = false; this.quad.renderOrder = -2; this.scene.add(this.quad);
    const positions = new Float32Array(768 * 3), seeds = new Float32Array(768);
    for (let i = 0; i < 768; i++) { positions[i * 3] = Math.random(); positions[i * 3 + 1] = Math.random(); positions[i * 3 + 2] = Math.random(); seeds[i] = Math.random(); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    this.particles = new THREE.Points(geometry, this.particleMaterial); this.particles.frustumCulled = false; this.particles.renderOrder = -1; this.scene.add(this.particles);
  }
  render(renderer: THREE.WebGLRenderer, dt: number, config: Config, audio: AudioEngine, theme: ThemeId, reduced: boolean, lyrics: boolean, palette: readonly string[], powered: boolean, accent: SongAccent | null = null): void {
    const index = themes.findIndex(entry => entry.id === theme);
    this.transition.select(index); this.transition.tick(dt, config.transitionDuration, reduced || !config.backgroundAnimation);
    this.accents.select(accent && config.songAccents ? accentEffects.indexOf(accent.effect) : 0);
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
    u.bands.value.set(audio.bass * strength, audio.mid * strength, audio.treble * strength);
    u.amplitude.value = audio.amplitude * strength; u.onset.value = Math.min(.6, audio.transient * strength);
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
    const p = this.particleMaterial.uniforms; p.orbit.value = this.transition.weights[1];
    p.aspect.value = u.resolution.value.x / Math.max(1, u.resolution.value.y); p.time.value = this.time; p.intensity.value = u.intensity.value;
    p.color.value.copy(u.accentColor.value); p.size.value = (4 + config.backgroundGlow * 4) * renderer.getPixelRatio();
    p.opacity.value = config.backgroundBrightness * (lyrics ? .45 : 1);
    this.particles.visible = config.particles && moving && config.particleDensity > 0;
    this.particles.geometry.setDrawRange(0, Math.round(performancePresets[config.lowPower ? 'low' : config.performancePreset].particles * config.particleDensity));
    renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.quad.geometry.dispose(); this.material.dispose(); this.particles.geometry.dispose(); this.particleMaterial.dispose(); this.scene.clear();
  }
}
