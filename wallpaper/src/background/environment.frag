precision highp float;
uniform float time;
uniform float weights[THEME_COUNT];
uniform float songWeights[8];
uniform vec2 resolution;
uniform vec3 primaryColor;
uniform vec3 accentColor;
uniform vec3 bands;
uniform float amplitude;
uniform float onset;
uniform float intensity;
uniform float glow;
uniform float analog;
uniform float brightness;
uniform float lyrics;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise2(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
}
float haze(vec2 p) { return noise2(p)*.57+noise2(p*2.03)*.28+noise2(p*4.01)*.15; }
float line(float d,float width) { return 1.-smoothstep(width,width+max(fwidth(d),.0015),abs(d)); }
float halo(vec2 p, vec2 center, vec2 scale) { return exp(-dot((p-center)*scale,(p-center)*scale)); }
// Transparent atmospheric accents only. The original cover-color gradient remains underneath.
vec3 environment(int id, vec2 p, float t) {
  float detail=0.;
  if(id==0) {
    float horizon=max(.02,-p.y+.1);
    float streak=line(fract(p.x/horizon*.5+t*.08)-.5,.004)*smoothstep(.15,.5,-p.y);
    detail=streak*.024+halo(p,vec2(-.6,.15),vec2(2.,3.))*.015;
  } else if(id==1) {
    float r=length(p-vec2(.15,-.1)), a=atan(p.y+.1,p.x-.15);
    float orbit=pow(max(0.,cos(r*20.+cos(a*6.+t*.1)*.3-t*.6)),28.);
    detail=orbit*.018*(1.+bands.x*.3)+halo(p,vec2(.15,-.1),vec2(2.))*.008*onset;
  } else if(id==2) {
    for(int j=0;j<3;j++) {
      float i=float(j); float path=.23*sin(p.x*2.4+t*.34+i*1.6)-.3+i*.24;
      detail+=exp(-pow((p.y-path)*30.,2.))*.015*(1.+bands.y*.2);
    }
  } else if(id==3) {
    float arc=.76+.035*sin(p.y*30.+t*.16)+.018*sin(p.y*83.);
    detail=exp(-abs(p.x-arc)*180.)*smoothstep(-.2,.4,p.y)*(.012+bands.x*.018+onset*.006);
  } else if(id==4) {
    float bar=line(fract(p.y*7.+t*.06)-.5,.007)*step(.76,fract(p.x*3.+floor(p.y*7.)*.3));
    detail=bar*.02*(1.+bands.x*.3);
  } else if(id==5) {
    float smoke=haze(p*3.+vec2(t*.08,-t*.06));
    float beam=pow(max(0.,cos(atan(p.x+.8,p.y-.8)-.15*sin(t*.13))),30.);
    detail=smoke*.018+beam*smoke*.022;
  } else if(id==6) {
    float rays=pow(.5+.5*sin(p.x*9.+sin(p.y*2.+t*.08)*1.3+t*.1),18.);
    detail=rays*(.008+.012*vUv.y)*exp(-p.x*p.x*.4);
  } else if(id==7) {
    float aurora=.22+.17*sin(p.x*2.4+t*.12)+.05*sin(p.x*7.-t*.1);
    detail=exp(-abs(p.y-aurora)*18.)*.027+haze(p*2.+vec2(t*.035,t*.02))*.008;
  } else if(id==8) {
    vec2 rain=vec2(p.x*70.+p.y*9.,p.y*9.+t*.65); vec2 cell=floor(rain), f=fract(rain);
    detail=exp(-abs(f.x-.5)*75.)*pow(f.y,6.)*step(.72,hash(vec2(cell.x,floor(cell.y-t*.65))))*.045;
  } else if(id==9) {
    vec2 q=p+vec2(sin(t*.12),cos(t*.1))*.12;
    float liquid=sin(q.x*3.+sin(q.y*3.+t*.18))+cos(q.y*4.-t*.14);
    detail=exp(-abs(liquid)*5.)*.025;
  } else {
    vec2 q=p+vec2(sin(p.y*3.+t*.13),cos(p.x*2.-t*.1))*.16;
    float contours=length(q-vec2(-.5,.1))*8.+haze(q*3.);
    detail=line(fract(contours)-.5,.008)*.02;
  }
  return mix(primaryColor,accentColor,.5+.25*sin(p.x*1.3+t*.05))*detail;
}
// Recording-specific accents are small and transparent; no scene or palette replacement.
vec3 songAccent(int id, vec2 p, float t) {
  if(id==1) {
    float trail=line(p.y+.23+.035*sin(p.x*2.+t*.15),.003);
    return primaryColor*trail*pow(.5+.5*sin(p.x*2.-t*.5),8.)*.07;
  } else if(id==2) {
    float r=length((p-vec2(-.65,.05))*vec2(.7,1.));
    return accentColor*line(r-.3-.005*sin(atan(p.y,p.x)*28.+t*.15),.002)*(.035+.01*sin(t*.2));
  } else if(id==3) {
    float column=floor(p.x*25.), height=hash(vec2(column,17.))*.15-.18;
    float edge=line(p.y-height,.002)+line(fract(p.x*25.)-.5,.02)*(1.-smoothstep(height,height+.003,p.y));
    return accentColor*edge*.035*smoothstep(-.48,-.24,p.y);
  } else if(id==4) {
    vec2 center=vec2(-.65,.28), q=(p-center)*vec2(1.,1.7);
    vec2 satellite=center+vec2(cos(t*.12),sin(t*.12)/1.7)*.23;
    return accentColor*(line(length(q)-.23,.0015)*.016+exp(-dot(p-satellite,p-satellite)*16000.)*.2);
  } else if(id==5) {
    return accentColor*haze(p*3.+vec2(t*.07,0.))*pow(.5+.5*sin(t*.22),6.)*.02;
  } else if(id==6) {
    float r=length(p-vec2(.75,.42));
    return accentColor*(exp(-r*r*60.)*.035+line(r-.1,.002)*.025);
  } else {
    float r=length((p-vec2(-.5,-.25))*vec2(.7,1.6));
    return mix(primaryColor,accentColor,.5+.5*sin(r*5.))*pow(.5+.5*cos(r*38.-t*.22),14.)*exp(-r*3.)*.035;
  }
}
void main() {
  vec2 p=(vUv-.5)*vec2(resolution.x/max(resolution.y,1.),1.)*2.;
  p+=vec2(sin(time*.09),cos(time*.07))*.012*intensity;
  vec3 c=vec3(0.);
  for(int i=0;i<THEME_COUNT;i++) if(weights[i]>.0001) c+=environment(i,p,time)*weights[i];
  for(int i=1;i<8;i++) if(songWeights[i]>.0001) c+=songAccent(i,p,time)*songWeights[i];
  c*=1.+glow*.24+amplitude*.12*intensity;
  float grain=hash(floor(vUv*resolution)+floor(time*12.));
  c+=primaryColor*analog*grain*.002;
  c*=1.-lyrics*.65*smoothstep(.15,.55,vUv.y);
  float alpha=clamp(max(max(c.r,c.g),c.b)*brightness,0.,.16);
  gl_FragColor=vec4(c/max(max(c.r,c.g),max(c.b,.0001)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
