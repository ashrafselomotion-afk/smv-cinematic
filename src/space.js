/* ---------- MINIMAL SPACE (Three.js + GSAP) — lazy-loaded after first interaction ---------- */
async function initSpace(){
try {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const THREE = await import('./vendor/three.module.min.js');
  const canvas = document.getElementById('space');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.set(0, 0, 60);

  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0,'rgba(255,255,255,1)');
    grad.addColorStop(.55,'rgba(255,255,255,.85)');
    grad.addColorStop(.8,'rgba(255,255,255,.12)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  })();

  function makePoints(count, color, size, spread){
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // hollow-ish sphere so the center stays clear behind the logo
      const r = spread * (0.62 + 0.38 * Math.cbrt(Math.random()));
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.72;
      pos[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, sizeAttenuation: true, map: dot,
      transparent: true, opacity: 0.85, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  const starsFar  = makePoints(360, 0xB8BCC6, 0.3, 95);
  const starsNear = makePoints(90,  0xE8E8EC, 0.5, 62);
  const embers    = makePoints(12,  0xE0652F, 0.6, 75);
  const field = new THREE.Group();
  field.add(starsFar, starsNear, embers);
  scene.add(field);

  /* theme-aware colors: soft white stars in dark mode, ink dots in light */
  const sysLightMq = matchMedia('(prefers-color-scheme: light)');
  function themeIsLight(){
    return (document.documentElement.dataset.theme || (sysLightMq.matches ? 'light' : 'dark')) === 'light';
  }
  function applySceneTheme(){
    const light = themeIsLight();
    starsFar.material.color.set(light ? 0x3A3A40 : 0xD8DCE6);
    starsNear.material.color.set(light ? 0x1E1E22 : 0xFFFFFF);
    [starsFar, starsNear, embers].forEach(p => {
      p.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      p.material.opacity = light ? 0.22 : 0.45;
      p.material.needsUpdate = true;
    });
  }
  applySceneTheme();
  sysLightMq.addEventListener('change', applySceneTheme);
  new MutationObserver(applySceneTheme)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function size(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  addEventListener('resize', size);

  /* GSAP-driven interactivity — gentle mouse parallax + slow scroll drift */
  const hasGSAP = typeof gsap !== 'undefined';
  if (hasGSAP && !reduced) {
    const px = gsap.quickTo(field.rotation, 'y', { duration: 1.8, ease: 'power2.out' });
    const py = gsap.quickTo(field.rotation, 'x', { duration: 1.8, ease: 'power2.out' });
    const cx = gsap.quickTo(camera.position, 'x', { duration: 2, ease: 'power2.out' });
    const cy = gsap.quickTo(camera.position, 'y', { duration: 2, ease: 'power2.out' });
    addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      px(nx * .18); py(ny * .12);
      cx(nx * 3.5); cy(-ny * 2.5);
    });
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.to(field.rotation, { z: 0.5, ease: 'none',
        scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 1.5 } });
    }
  }

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    const t = clock.getElapsedTime();
    if (!reduced) {
      starsFar.rotation.y  = t * 0.006;
      starsNear.rotation.y = -t * 0.01;
      embers.rotation.y    = t * 0.015;
    }
    renderer.render(scene, camera);
  });
} catch (err) {
  // WebGL/CDN unavailable — the pure-black background stays
  console.warn('space scene skipped:', err);
}
}
let spaceStarted = false;
function startSpace(){ if (spaceStarted) return; spaceStarted = true; initSpace(); }
/* the field sits behind the sections below the hero, so it only needs to exist once the visitor moves */
addEventListener('scroll', startSpace, { once: true, passive: true });
addEventListener('pointermove', startSpace, { once: true, passive: true });
addEventListener('touchstart', startSpace, { once: true, passive: true });

/* ======================= SHADER HERO (Three.js + GLSL) =======================
   The hero video is rendered through a custom fragment shader: the SMV. letters are a
   window onto vivid footage, everything outside is cinematic-dark, the picture liquefies
   under the cursor with chromatic aberration, and scrolling zooms through the letters. */
async function initHeroGL(){
  const canvas = document.getElementById('heroGL'), video = document.querySelector('#hero .vid');
  if (!canvas || !video || window.__reduced || (navigator.connection && navigator.connection.saveData)) return;
  try {
    const THREE = await import('./vendor/three.module.min.js');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias:false, alpha:false, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1 : 1.5));
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter;
    const bg = () => { const v = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(); const n = parseInt(v.slice(1),16); return new THREE.Vector3(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255); };
    const u = { uVideo:{value:vtex}, uRes:{value:new THREE.Vector2(1,1)}, uVRes:{value:new THREE.Vector2(16,9)},
      uMouse:{value:new THREE.Vector2(.5,.5)}, uTime:{value:0}, uProgress:{value:0}, uHover:{value:0}, uBg:{value:bg()} };
    const mat = new THREE.ShaderMaterial({ uniforms:u, vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D uVideo;uniform vec2 uRes,uVRes,uMouse;uniform float uTime,uProgress,uHover;uniform vec3 uBg;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 uv=vUv; float sa=uRes.x/uRes.y, va=uVRes.x/uVRes.y;          /* cover-fit the video */
        vec2 cuv=uv-.5; if(sa>va) cuv.y*=va/sa; else cuv.x*=sa/va; cuv+=.5;
        vec2 m=uMouse; vec2 d=uv-m; d.x*=sa; float dist=length(d);
        float w=noise(uv*6.+uTime*.25)-.5;                                   /* slow liquid drift */
        float rip=smoothstep(.42,0.,dist)*(.018*sin(dist*38.-uTime*4.5)+.012*w)*(.35+uHover);
        vec2 duv=cuv+normalize(d+1e-4)*rip+w*.004;
        float p=0.; float inL=1., isDot=0.;
        float ab=.002+.0025*uHover;
        vec3 vivid=vec3(texture2D(uVideo,duv+vec2(ab,0)).r,texture2D(uVideo,duv).g,texture2D(uVideo,duv-vec2(ab,0)).b)*1.02;
        vec3 vid=texture2D(uVideo,duv).rgb; float g=dot(vid,vec3(.299,.587,.114));
        vec3 outside=mix(vec3(g),vid,.3)*.16;
        vec3 col=mix(outside,vivid,inL);
        col=mix(col,vec3(.88,.40,.18),isDot);                                  /* the orange dot stays solid */
        float vig=smoothstep(1.25,.35,length((uv-.5)*vec2(sa,1.)));
        col*=mix(.75,1.,vig);
        col+=(hash(uv*uRes+fract(uTime))-.5)*.05;                             /* film grain */
        gl_FragColor=vec4(col,1.);
      }` });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), mat));
    function size(){
      const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false);
      u.uRes.value.set(w*renderer.getPixelRatio(), h*renderer.getPixelRatio());
    }
    video.addEventListener('loadedmetadata', () => u.uVRes.value.set(video.videoWidth||16, video.videoHeight||9));
    if (video.videoWidth) u.uVRes.value.set(video.videoWidth, video.videoHeight);
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    await fontsReady; size(); addEventListener('resize', size);
    new MutationObserver(() => { u.uBg.value = bg(); }).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
    let tx=.5, ty=.5, hoverT=0;
    addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); tx = (e.clientX - r.left)/r.width; ty = 1 - (e.clientY - r.top)/r.height; hoverT = 1; }, { passive:true });
    addEventListener('pointerleave', () => { hoverT = 0; });
    const clock = new THREE.Clock(); let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(document.getElementById('hero'));
    document.documentElement.classList.add('gl');
    renderer.setAnimationLoop(() => {
      if (!visible || document.hidden) return;
      u.uTime.value = clock.getElapsedTime();
      u.uMouse.value.x += (tx - u.uMouse.value.x)*.06; u.uMouse.value.y += (ty - u.uMouse.value.y)*.06;
      u.uHover.value += (hoverT - u.uHover.value)*.05; hoverT *= .98;
      renderer.render(scene, cam);
    });
  } catch (err) { console.warn('hero shader skipped:', err); }
}
if (document.readyState === 'complete') initHeroGL(); else addEventListener('load', initHeroGL, { once:true });
