import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import vertexShader from './shaders/crt.vert?raw';
import fragmentShader from './shaders/crt.frag?raw';
import type { Config } from '../core/Config';
import type { ScreenPainter } from '../ui/ScreenPainter';

function woodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#583723'; ctx.fillRect(0, 0, 512, 512);
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1800; i++) {
    const y = rand() * 512; ctx.strokeStyle = `rgba(${rand() > 0.55 ? '215,153,96' : '22,9,3'},${rand() * 0.13})`;
    ctx.lineWidth = rand() * 1.4; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 16) ctx.lineTo(x, y + Math.sin(x / 80 + y) * (rand() * 3 + 1)); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function label(text: string, width: number, height = 0.18, color = '#baa981'): THREE.Mesh {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d')!; ctx.font = '28px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, 256, 49);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
}
export class Television {
  readonly group = new THREE.Group();
  readonly targets: THREE.Object3D[] = [];
  readonly shader: THREE.ShaderMaterial;
  private wood = woodTexture();
  private bodyMaterial = new THREE.MeshStandardMaterial({ map: this.wood, roughness: 0.62, color: 0xe0bea0 });
  private antenna = new THREE.Group();
  private ledMaterial = new THREE.MeshStandardMaterial({ color: 0xe5a259, emissive: 0xff8430, emissiveIntensity: 1.5 });
  readonly channel = new THREE.Group();
  private channelAngle = 0;
  private trim = new THREE.MeshStandardMaterial({ color: 0x998d72, metalness: 0.75, roughness: 0.39 });
  private surround = new THREE.MeshStandardMaterial({ color: 0x74654c, metalness: 0.45, roughness: 0.55 });
  private panel = new THREE.MeshStandardMaterial({ color: 0x514e3c, roughness: 0.8 });
  private theme = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  constructor(painter: ScreenPainter) {
    const black = new THREE.MeshStandardMaterial({ color: 0x181a16, roughness: 0.48 });
    const silver = this.trim;
    const bronze = this.surround;
    const box = (w: number, h: number, d: number, r: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh); return mesh;
    };
    box(7.4, 4.65, 2.25, 0.22, this.bodyMaterial, 0, 0, 0);
    box(7.0, 4.29, 0.18, 0.16, bronze, 0, 0, 1.12);
    box(6.85, 4.13, 0.12, 0.14, black, 0, 0, 1.23);
    box(5.18, 3.88, 0.22, 0.30, silver, -0.72, 0.06, 1.31);
    box(5.04, 3.74, 0.25, 0.34, black, -0.72, 0.06, 1.42);
    this.shader = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: {
      screen: { value: painter.texture }, time: { value: 0 }, brightness: { value: 1 }, bass: { value: 0 }, treble: { value: 0 }, tuning: { value: 0 },
      ...Object.fromEntries(['scanlines', 'aberration', 'noise', 'curvature', 'glow', 'reflections', 'interference'].map(key => [key, { value: 1 }])),
    } });
    const geometry = new THREE.PlaneGeometry(4.75, 3.47, 48, 36);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i) / 2.375; const y = position.getY(i) / 1.735;
      position.setZ(i, 0.16 * Math.max(0, 1 - x * x) * Math.max(0, 1 - y * y));
    }
    geometry.computeVertexNormals();
    const screen = new THREE.Mesh(geometry, this.shader); screen.position.set(-0.72, 0.06, 1.58); this.group.add(screen);
    box(1.31, 3.89, 0.07, 0.07, this.panel, 2.67, 0.04, 1.34);
    const logo = label('R E T R O W A V E', 1.1); logo.position.set(2.67, 1.72, 1.40); this.group.add(logo);
    const dial = (y: number, action: string, caption: string) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 64), silver); ring.rotation.x = Math.PI / 2; ring.position.set(2.67, y, 1.42); this.group.add(ring);
      const pivot = action === 'channel' ? this.channel : new THREE.Group();
      pivot.name = action + '-pivot'; pivot.position.set(2.67, y, 1.54); this.group.add(pivot);
      const geometry = new THREE.CylinderGeometry(0.34, 0.37, 0.22, 48); geometry.rotateX(Math.PI / 2);
      const knob = new THREE.Mesh(geometry, black); knob.userData.action = action; pivot.add(knob); this.targets.push(knob);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.025), silver); marker.position.set(0, 0.14, 0.1225); pivot.add(marker);
      const txt = label(caption, 0.99, 0.15); txt.position.set(2.67, y - 0.52, 1.43); this.group.add(txt);
      for (let i = 0; i < 11; i++) {
        const a = (i / 10) * Math.PI * 1.5 - Math.PI * 0.75;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.055, 0.013), silver); tick.position.set(2.67 + Math.sin(a) * 0.48, y + Math.cos(a) * 0.48, 1.43); tick.rotation.z = -a; this.group.add(tick);
      }
      return knob;
    };
    dial(0.95, 'channel', 'CHANNEL'); dial(-0.25, 'intensity', 'VOLUME / GAIN');
    for (let i = 0; i < 12; i++) box(1.04, 0.025, 0.02, 0.004, black, 2.67, -1.0 - i * 0.045, 1.4);
    const power = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.1, 32), silver); power.rotation.x = Math.PI / 2; power.position.set(2.3, -1.8, 1.46); power.userData.action = 'power'; this.group.add(power); this.targets.push(power);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 12), this.ledMaterial); led.position.set(3.03, -1.8, 1.44); this.group.add(led);
    const p = label('POWER', 0.46, 0.1); p.position.set(2.65, -1.8, 1.44); this.group.add(p);
    const branding = label('SOLID STATE  /  STEREOPHONIC', 2.35, 0.13); branding.position.set(-0.7, -1.87, 1.58); this.group.add(branding);
    // Vents on the side have actual relief and remain visible while dragging.
    for (let i = 0; i < 14; i++) box(0.03, 1.3, 0.035, 0.005, black, 3.702, 0.15, -0.72 + i * 0.085);
    for (const x of [-2.7, 2.7]) {
      const foot = box(0.5, 0.35, 1.5, 0.06, black, x, -2.45, -0.1); foot.rotation.z = x > 0 ? -0.09 : 0.09;
    }
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 12), silver); base.position.set(0.5, 2.28, -0.3); this.antenna.add(base);
    for (const sign of [-1, 1]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.027, 2.2, 12), silver); rod.position.set(0.5 + sign * 0.57, 3.16, -0.3); rod.rotation.z = sign * -0.55; this.antenna.add(rod);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), silver); tip.position.set(0.5 + sign * 1.14, 4.08, -0.3); this.antenna.add(tip);
    }
    this.group.add(this.antenna);
  }
  configure(config: Config, powered: boolean): void {
    this.bodyMaterial.map = config.casing === 'wood' ? this.wood : null;
    this.bodyMaterial.color.set(config.casing === 'wood' ? 0xe0bea0 : 0xb7ad92); this.bodyMaterial.needsUpdate = true;
    this.antenna.visible = config.antenna; this.ledMaterial.emissiveIntensity = powered ? 1.5 : 0;
    this.channelAngle = config.mode === 'broadcast' ? 0 : Math.PI / 2;
    this.shader.uniforms.brightness.value = config.brightness;
    for (const key of ['scanlines', 'aberration', 'noise', 'curvature', 'glow', 'reflections', 'interference'] as const) this.shader.uniforms[key].value = config[key] ? 1 : 0;
  }
  updateDial(dt: number, reduced: boolean): void {
    this.channel.rotation.z = reduced ? this.channelAngle : THREE.MathUtils.damp(this.channel.rotation.z, this.channelAngle, 14, dt);
    if (Math.abs(this.channel.rotation.z - this.channelAngle) < 0.0001) this.channel.rotation.z = this.channelAngle;
  }
  syncPalette(palette: string[], dt: number, casing: Config['casing']): void {
    const blend = 1 - Math.exp(-2.8 * dt);
    this.theme.forEach((color, i) => color.set(palette[i]));
    this.bodyMaterial.color.lerp(this.theme[0].clone().lerp(new THREE.Color('#ffffff'), casing === 'wood' ? 0.28 : 0.55), blend);
    this.trim.color.lerp(this.theme[2].clone().lerp(new THREE.Color('#ffffff'), 0.45), blend);
    this.surround.color.lerp(this.theme[1], blend);
    this.panel.color.lerp(this.theme[1].clone().multiplyScalar(0.45), blend);
    this.ledMaterial.color.lerp(this.theme[0], blend); this.ledMaterial.emissive.lerp(this.theme[0], blend);
  }
  dispose(): void {
    const textures = new Set<THREE.Texture>(); const materials = new Set<THREE.Material>();
    this.group.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          materials.add(m); if ('map' in m && m.map instanceof THREE.Texture) textures.add(m.map);
        }
      }
    });
    materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); this.wood.dispose();
  }
}
