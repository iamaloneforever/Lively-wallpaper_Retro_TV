import * as THREE from 'three';
import type { Config } from '../core/Config';
import type { AudioEngine } from '../audio/AudioEngine';
import type { ScreenPainter } from '../ui/ScreenPainter';
import { Television } from './Television';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  readonly tv: Television;
  private light = new THREE.PointLight(0x9eb895, 20, 12, 2);
  private particles: THREE.Points;
  private pointer = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private drag: { x: number; y: number; rotation: number; moved: boolean } | null = null;
  private desiredRotation = -0.09;
  private resizeTimer = 0;
  private removers: (() => void)[] = [];
  private quality = 1.5;
  private frames = 0;
  private slowFrames = 0;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  contextLost = false;
  onAction: (action: string) => void = () => {};
  constructor(private container: HTMLElement, painter: ScreenPainter) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x101512, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D vintage television. Drag to rotate.');
    this.container.append(this.renderer.domElement);
    this.tv = new Television(painter); this.scene.add(this.tv.group);
    this.scene.add(new THREE.HemisphereLight(0xd6e0c7, 0x29251e, 2.6));
    const key = new THREE.DirectionalLight(0xffe0b4, 4.2); key.position.set(-5, 8, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -8; key.shadow.normalBias = 0.025; key.shadow.radius = 4; this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x789b9a, 3.1); rim.position.set(5, 4, -4); this.scene.add(rim);
    this.light.position.set(-0.6, -0.4, 3.2); this.scene.add(this.light);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.27 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -2.63; floor.receiveShadow = true; this.scene.add(floor);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!; const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(137,170,130,0.10)'); gradient.addColorStop(1, 'rgba(137,170,130,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(canvas);
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(15, 9), new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false })); reflection.rotation.x = -Math.PI / 2; reflection.position.set(0, -2.62, 1); this.scene.add(reflection);
    const points = new Float32Array(90 * 3);
    for (let i = 0; i < points.length; i += 3) { points[i] = (Math.random() - 0.5) * 18; points[i + 1] = Math.random() * 10 - 3; points[i + 2] = (Math.random() - 0.5) * 9; }
    this.particles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(points, 3)), new THREE.PointsMaterial({ color: 0xc0b18b, size: 0.014, transparent: true, opacity: 0.2, depthWrite: false })); this.scene.add(this.particles);
    this.camera.position.set(1.3, 1.2, 15.8); this.camera.lookAt(0, 0.5, 0);
    const listen = <K extends keyof HTMLElementEventMap>(type: K, fn: (event: HTMLElementEventMap[K]) => void) => {
      this.renderer.domElement.addEventListener(type, fn); this.removers.push(() => this.renderer.domElement.removeEventListener(type, fn));
    };
    listen('pointerdown', event => {
      if (event.button !== 0) return;
      this.drag = { x: event.clientX, y: event.clientY, rotation: this.desiredRotation, moved: false }; this.renderer.domElement.setPointerCapture(event.pointerId);
    });
    listen('pointermove', event => {
      const bounds = this.container.getBoundingClientRect();
      this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      if (this.drag) {
        const delta = event.clientX - this.drag.x; if (Math.hypot(delta, event.clientY - this.drag.y) > 5) this.drag.moved = true;
        this.desiredRotation = THREE.MathUtils.clamp(this.drag.rotation + delta * 0.003, -0.5, 0.5);
      }
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.renderer.domElement.style.cursor = this.drag ? 'grabbing' : this.raycaster.intersectObjects(this.tv.targets).length ? 'pointer' : 'grab';
    });
    listen('pointerup', event => {
      if (this.drag && !this.drag.moved) {
        const bounds = this.container.getBoundingClientRect();
        this.pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObjects(this.tv.targets)[0]; if (hit) this.onAction(String(hit.object.userData.action));
      }
      this.drag = null;
    });
    listen('pointercancel', () => { this.drag = null; });
    listen('pointerleave', () => { this.pointer.set(0, 0); });
    const lost = (event: Event) => { event.preventDefault(); this.contextLost = true; };
    const restored = () => { this.contextLost = false; painter.texture.needsUpdate = true; this.resize(); };
    this.renderer.domElement.addEventListener('webglcontextlost', lost);
    this.renderer.domElement.addEventListener('webglcontextrestored', restored);
    this.removers.push(() => { this.renderer.domElement.removeEventListener('webglcontextlost', lost); this.renderer.domElement.removeEventListener('webglcontextrestored', restored); });
    const resize = () => { clearTimeout(this.resizeTimer); this.resizeTimer = window.setTimeout(() => this.resize(), 100); };
    window.addEventListener('resize', resize); this.removers.push(() => window.removeEventListener('resize', resize)); this.resize();
  }
  resize(): void {
    const width = this.container.clientWidth; const height = this.container.clientHeight;
    this.renderer.setSize(width, height); this.camera.aspect = width / Math.max(height, 1);
    this.camera.fov = width / height < 1.1 ? 46 : 34;
    this.camera.position.z = width / height < 0.7 ? 21 : 15.8;
    this.camera.updateProjectionMatrix();
  }
  render(time: number, dt: number, config: Config, audio: AudioEngine, painter: ScreenPainter, powered: boolean): void {
    const start = performance.now();
    this.tv.group.rotation.y = THREE.MathUtils.damp(this.tv.group.rotation.y, this.desiredRotation, 7, dt);
    const motion = config.lowPower || this.reducedMotion ? 0 : 1;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, 1.3 + this.pointer.x * 0.22 * motion, 3, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 1.2 + this.pointer.y * 0.13 * motion + audio.bass * 0.018 * config.intensity, 3, dt); this.camera.lookAt(0, 0.5, 0);
    const u = this.tv.shader.uniforms; u.time.value = time; u.bass.value = powered ? audio.bass * config.intensity : 0; u.treble.value = audio.treble * config.intensity;
    u.tuning.value = powered && config.interference ? Math.max(0, 1 - (time - painter.transition) / 0.65) : 0;
    this.light.color.set(painter.accent); this.light.intensity = powered && config.glow ? 12 + audio.bass * 16 * config.intensity : 0;
    this.particles.visible = config.particles && !config.lowPower; this.particles.rotation.y = time * 0.004; (this.particles.material as THREE.PointsMaterial).opacity = 0.12 + audio.treble * 0.16 * config.intensity;
    const ratio = Math.min(window.devicePixelRatio, config.lowPower ? 1 : this.quality);
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    this.renderer.render(this.scene, this.camera);
    if (performance.now() - start > 20) this.slowFrames++;
    if (++this.frames >= 180) { if (this.slowFrames > 45) this.quality = Math.max(0.8, this.quality - 0.2); this.frames = this.slowFrames = 0; }
  }
  dispose(): void {
    clearTimeout(this.resizeTimer); this.removers.forEach(fn => fn()); this.tv.dispose();
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose(); const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of ms) { if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose(); m.dispose(); }
      }
    });
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
