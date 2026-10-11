uniform sampler2D screen;
uniform float time;
uniform float brightness;
uniform float bass;
uniform float treble;
uniform float tuning;
uniform float scanlines;
uniform float aberration;
uniform float noise;
uniform float curvature;
uniform float glow;
uniform float reflections;
uniform float interference;
varying vec2 vUv;
float random(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  vec2 uv = 0.5 + p * (1.0 + curvature * 0.022 * dot(p, p)) * 0.5;
  float line = sin(uv.y * 190.0 + time * 23.0);
  uv.x += tuning * line * 0.019;
  uv.x += interference * 0.001 * sin(time * 2.7 + uv.y * 14.0) * pow(max(0.0, sin(time * 0.6)), 24.0);
  float split = aberration * (0.0009 + treble * 0.0004);
  vec3 c = vec3(texture2D(screen, uv + vec2(split, 0.0)).r, texture2D(screen, uv).g, texture2D(screen, uv - vec2(split, 0.0)).b);
  vec3 bloom = (texture2D(screen, uv + vec2(0.002, 0.0)).rgb + texture2D(screen, uv - vec2(0.002, 0.0)).rgb + texture2D(screen, uv + vec2(0.0, 0.003)).rgb + texture2D(screen, uv - vec2(0.0, 0.003)).rgb) * 0.25;
  c += bloom * glow * 0.13;
  c *= 1.0 - scanlines * (0.035 + 0.035 * sin(uv.y * 768.0 * 3.14159));
  c *= 1.0 - aberration * 0.025 * (0.5 + 0.5 * sin(uv.x * 3072.0));
  c += (random(uv + fract(time)) - 0.5) * (noise * 0.018 + tuning * 0.3);
  c *= (1.0 - 0.16 * dot(p, p)) * brightness * (1.0 + glow * bass * 0.10 + interference * 0.003 * sin(time * 31.0));
  float reflection = pow(max(0.0, 1.0 - length((vUv - vec2(0.20, 0.90)) * vec2(1.0, 3.5))), 3.0);
  c += reflection * 0.065 * reflections * vec3(0.8, 0.9, 0.85);
  vec2 edge = abs(p);
  float rounded = length(max(edge - vec2(0.84, 0.80), 0.0));
  float mask = 1.0 - smoothstep(0.185, 0.205, rounded);
  gl_FragColor = vec4(max(vec3(0.0), c) * mask, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
