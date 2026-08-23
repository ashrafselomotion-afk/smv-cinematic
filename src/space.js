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
    grad.addColorStop(.35,'rgba(255,255,255,.7)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  })();

  function makePoints(count, color, size, spread){
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // hollow-ish sphere so the center stays clear behind the logo
      const r = spread * (0.35 + 0.65 * Math.cbrt(Math.random()));
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

  const starsFar  = makePoints(420, 0xB8BCC6, 0.42, 95);
  const starsNear = makePoints(110, 0xE8E8EC, 0.8, 55);
  const embers    = makePoints(16,  0xFF4A1F, 1.1, 70);
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
      p.material.opacity = light ? 0.3 : 0.6;
      p.material.needsUpdate = true;
    });
  }
  applySceneTheme();
  sysLightMq.addEventListener('change', applySceneTheme);
  new MutationObserver(applySceneTheme)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function size(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
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
