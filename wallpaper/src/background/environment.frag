precision highp float;
uniform float time;
uniform float weights[THEME_COUNT];
uniform float songWeights[SONG_EFFECT_COUNT];
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
  } else if(id==7) {
    float r=length((p-vec2(-.5,-.25))*vec2(.7,1.6));
    return mix(primaryColor,accentColor,.5+.5*sin(r*5.))*pow(.5+.5*cos(r*38.-t*.22),14.)*exp(-r*3.)*.035;
  } else if(id==8) {
    // Three staggered meteors: no random per-frame spawning or added geometry.
    float light=0.;
    for(int j=0;j<3;j++) {
      float k=float(j), phase=fract(t*.035+k*.31);
      vec2 head=vec2(-1.6+phase*3.2,.6-k*.23-phase*.22), q=p-head;
      light+=exp(-dot(q,q)*10000.)*.13+exp(-abs(q.y+q.x*.07)*900.)*exp(-abs(q.x+.035)*45.)*.035;
    }
    return accentColor*light;
  } else if(id==9) {
    vec2 q=p-vec2(-.72,.28); float phase=fract(t*.045), r=length(q), a=atan(q.y,q.x);
    float sparks=pow(max(0.,cos(a*10.+sin(a*3.))),28.);
    float bloom=line(r-phase*.24,.003)*sparks*sin(phase*3.14159);
    return accentColor*bloom*.075;
  } else if(id==10) {
    vec2 q=vec2(p.x*55.+p.y*4.,p.y*7.+t*.55), f=fract(q);
    float rain=exp(-abs(f.x-.5)*85.)*pow(f.y,5.)*step(.6,hash(floor(q)));
    return accentColor*rain*.045;
  } else if(id==11) {
    float arc=.82+.035*sin(p.y*22.+t*.05)+.012*sin(p.y*63.);
    float branch=exp(-abs(p.x-arc)*220.);
    branch+=exp(-abs(p.x-(arc+.18*(p.y-.1)))*260.)*smoothstep(.1,.38,p.y);
    return accentColor*branch*(.018+.012*sin(t*.15));
  } else if(id==12) {
    vec2 q=(p-vec2(-.72,-.22))*vec2(1.,1.25); float r=length(q);
    float sphere=1.-smoothstep(.145,.15,r);
    float longitude=line(sin(q.x*60.+t*.2)*sqrt(max(0.,.0225-q.y*q.y)),.003);
    float latitude=line(fract(q.y*22.)-.5,.035);
    return accentColor*(line(r-.15,.002)*.04+(longitude+latitude)*sphere*.018);
  } else if(id==13) {
    vec2 q=p-vec2(-.7,-.25); float trace=line(q.y-.025*sin(floor(q.x*18.)),.002)*step(abs(q.x),.35);
    float dotLight=exp(-dot(q-vec2(sin(t*.16)*.3,0.),q-vec2(sin(t*.16)*.3,0.))*14000.);
    return accentColor*(trace*.025+dotLight*.1);
  } else if(id==14) {
    vec2 q=p-vec2(.78,.22); float r=length(q), a=atan(q.y,q.x);
    float dial=line(r-.135,.002)+line(fract(a*12./6.283185)-.5,.04)*smoothstep(.108,.13,r)*(1.-smoothstep(.135,.14,r));
    // Hands and pendulum are decorative clocks, never a claimed music-tempo estimate.
    vec2 hand=vec2(cos(t*.08),sin(t*.08));
    float pointer=line(q.x*hand.y-q.y*hand.x,.0015)*step(0.,dot(q,hand))*step(r,.1);
    float pendulum=line(q.x-sin(t*.35)*max(0.,-q.y)*.35,.0015)*step(q.y,-.14)*step(-.34,q.y);
    return accentColor*(dial*.025+pointer*.04+pendulum*.025);
  } else if(id==15) {
    vec2 q=p-vec2(-.72,.15); float r=length(q), a=atan(q.y,q.x)+t*.05;
    float petals=line(r-(.12+.045*cos(a*6.)),.002);
    return mix(primaryColor,accentColor,.5+.5*sin(a*3.))*petals*.05;
  } else if(id==16) {
    vec2 q=p-vec2(-.68,-.25); float r=length(q), a=atan(q.y,q.x);
    float arc=line(r-.16,.002)*smoothstep(-.01,.02,q.y);
    float rays=pow(max(0.,cos(a*12.+t*.025)),36.)*smoothstep(.17,.19,r)*(1.-smoothstep(.23,.27,r))*step(0.,q.y);
    return accentColor*(arc*.04+rays*.018);
  } else if(id==17) {
    float petals=0.;
    for(int j=0;j<6;j++) {
      float k=float(j); vec2 center=vec2(sin(k*12.3)*1.15+sin(t*.08+k)*.07,1.-fract(k*.173+t*.022)*2.);
      vec2 q=p-center; float angle=t*.1+k;
      q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
      petals+=exp(-dot(q*vec2(85.,170.),q*vec2(85.,170.)))*.08;
    }
    return accentColor*petals;
  } else if(id==18) {
    vec2 q=vec2(p.x*13.,p.y*8.+t*.13), cell=floor(q), f=fract(q)-.5;
    float flakes=exp(-dot(f,f)*900.)*step(.7,hash(cell));
    return accentColor*flakes*.09;
  } else if(id==19) {
    float wave=0.;
    for(int j=0;j<3;j++) {
      float k=float(j); wave+=line(p.y+.38+k*.035+.025*sin(p.x*5.-t*.18+k),.0015)*.023;
    }
    return accentColor*wave;
  } else if(id==20) {
    vec2 q=p-vec2(-.78,-.22); float r=length(q);
    float record=line(r-.13,.002)+line(r-.095,.001)+line(r-.075,.001)+line(r-.02,.002);
    float groove=pow(max(0.,cos(atan(q.y,q.x)-t*.2)),40.)*smoothstep(.025,.04,r)*(1.-smoothstep(.12,.13,r));
    return accentColor*(record*.025+groove*.018);
  } else if(id==21) {
    // A tiny CRT badge follows a smooth rectangular path; its position is independent of lyrics.
    float phase=mod(t*.06,4.); vec2 center;
    if(phase<1.) center=vec2(mix(-.95,.95,phase),-.42);
    else if(phase<2.) center=vec2(.95,mix(-.42,.52,phase-1.));
    else if(phase<3.) center=vec2(mix(.95,-.95,phase-2.),.52);
    else center=vec2(-.95,mix(.52,-.42,phase-3.));
    vec2 q=p-center; vec2 edge=abs(q)-vec2(.043,.032);
    float badge=line(max(edge.x,edge.y),.0015);
    float aerial=line(q.y-.045-abs(q.x)*.45,.001)*step(abs(q.x),.025);
    return accentColor*(badge+aerial)*.045;
  } else if(id==22) {
    vec2 q=p-vec2(.78,.38); float r=length(q), a=atan(q.y,q.x);
    float ball=line(r-.085,.002)+line(fract(a*8./6.283185+t*.015)-.5,.03)*step(r,.083)*.5;
    float glints=0.;
    for(int j=0;j<4;j++) {
      float k=float(j); vec2 star=p-vec2(.78+cos(t*.09+k*1.57)*.2,.38+sin(t*.09+k*1.57)*.12);
      glints+=exp(-dot(star,star)*20000.)*.045;
    }
    return accentColor*(ball*.025+glints);
  }
  return vec3(0.);
}
void main() {
  vec2 p=(vUv-.5)*vec2(resolution.x/max(resolution.y,1.),1.)*2.;
  p+=vec2(sin(time*.09),cos(time*.07))*.012*intensity;
  vec3 c=vec3(0.);
  __THEME_LAYERS__
  __SONG_LAYERS__
  c*=1.+glow*.24+amplitude*.12*intensity;
  float grain=hash(floor(vUv*resolution)+floor(time*12.));
  c+=primaryColor*analog*grain*.002;
  c*=1.-lyrics*.65*smoothstep(.15,.55,vUv.y);
  float alpha=clamp(max(max(c.r,c.g),c.b)*brightness,0.,.16);
  gl_FragColor=vec4(c/max(max(c.r,c.g),max(c.b,.0001)),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
