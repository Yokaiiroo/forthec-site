// ============================================================
// FortHeC° LAB — shared "reactor" engine (three.js), extracted from
// v2-lab.html so the same visual can be ported to other pages without
// duplicating ~250 lines per file. Each page calls initReactorLab()
// with its own real KPI numbers for the echo trace + label, and can
// call runBoot() for the terminal-compile intro before its own GSAP
// entrance timeline (kept per-page, since each hero's DOM differs).
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The boot terminal is a first-impression flourish, not something that
// should replay on every internal nav click now that the 6 pages link to
// each other — play it once per browser session (sessionStorage, so a
// fresh tab/session still gets the full intro).
const BOOT_KEY = 'forthec-reactor-booted';
export function shouldSkipBoot() {
  return sessionStorage.getItem(BOOT_KEY) === '1';
}
export function markBooted() {
  sessionStorage.setItem(BOOT_KEY, '1');
}

// Real site's "app switcher" (js/main.js) — a vertical tab pinned to the
// right edge that expands a panel linking to the real hosted apps. Same
// behavior (localStorage-persisted open state, click-outside closes),
// reskinned to the reactor palette instead of the real site's white panel.
export function initAppSwitcher() {
  const STORAGE_KEY = 'forthec-app-switcher-open';
  const wrap = document.createElement('div');
  wrap.className = 'app-switcher';
  wrap.innerHTML = `
    <div class="app-switcher-panel">
      <h4>Nos applications</h4>
      <a class="app-switcher-link" href="https://console-app.forthec.fr/" target="_blank" rel="noopener">Console</a>
      <a class="app-switcher-link" href="https://app.forthec.fr/" target="_blank" rel="noopener">Energy</a>
    </div>
    <button type="button" class="app-switcher-tab" aria-expanded="false">Applications</button>
  `;
  document.body.appendChild(wrap);
  const tab = wrap.querySelector('.app-switcher-tab');
  function setOpen(open) {
    wrap.classList.toggle('open', open);
    tab.setAttribute('aria-expanded', String(open));
    localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  }
  if (localStorage.getItem(STORAGE_KEY) === '1') setOpen(true);
  tab.addEventListener('click', () => setOpen(!wrap.classList.contains('open')));
  document.addEventListener('click', (e) => {
    if (wrap.classList.contains('open') && !wrap.contains(e.target)) setOpen(false);
  });
}

// Real site's mobile hamburger (js/main.js) — injected in JS rather than
// duplicated per page. Fixes the same real bug the comment over there
// describes: under the CSS-only flex-wrap, 8 nav links + a CTA simply
// overflow the viewport on real phone widths instead of wrapping — there is
// no room for them to wrap into. Reskinned to the reactor palette below.
export function initMobileNav() {
  const nav = document.querySelector('nav');
  const links = document.querySelector('.nav-links');
  if (!nav || !links) return;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-toggle';
  toggle.setAttribute('aria-label', 'Ouvrir le menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(toggle);
  function setOpen(open) {
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('nav-open-lock', open);
  }
  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) setOpen(false); });
}

// Marks the current page's link in .nav-links — one shared function instead
// of hardcoding an "active" class differently in each of the 6 lab pages.
export function markActiveNav() {
  const here = location.pathname.split('/').pop() || 'v2-lab.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === here) a.classList.add('active');
  });
}

export function initReactorLab({
  canvasId = 'reactor-canvas',
  coreOffsetX = 2.0,
  echoValues = [85, 95, 90, 75, 33],
  echoLabel = 'energy.forthec.fr · audit_gains',
  // Test flag (energy page only for now): swaps the flat wireframe inner
  // core for a real PBR solid — metal/clearcoat + procedural studio
  // reflections (PMREMGenerator + RoomEnvironment, no external HDRI file
  // needed) — instead of adding another giant conditional block, other
  // pages just don't pass this and get the exact look they had before.
  premiumCore = false
} = {}) {

  const canvas = document.getElementById(canvasId);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (premiumCore) {
    // PBR materials read flat/washed-out under the default linear output —
    // ACES filmic is the standard tonemap that makes metal/clearcoat read
    // as "premium" instead of grey plastic.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.2, 7.2);

  // Procedural "machined/etched" surface detail — fine random bump noise as
  // a tangent-space normal map, so the facets read as engineered material
  // instead of perfect glossy plastic. Neutral normal-map color is
  // (128,128,255); small random offsets on R/G give the bump.
  function makeNormalNoiseTexture(size, strength) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i]   = 128 + (Math.random() - 0.5) * strength;
      img.data[i+1] = 128 + (Math.random() - 0.5) * strength;
      img.data[i+2] = 255;
      img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    return tex;
  }
  const etchedNormalMap = premiumCore ? makeNormalNoiseTexture(256, 20) : null;

  let voltLight = null, amberLight = null;
  if (premiumCore) {
    // Procedural "studio" environment map — gives real PBR reflections/IBL
    // lighting without needing to source and self-host an external HDRI file.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // Two accent point-lights in the real brand duality colors (volt =
    // data/electric, amber = money) for specular highlights the flat IBL
    // alone won't give. Declared outer-scope (not const-in-block) because
    // the scroll-morph below needs to fade their intensity over time.
    voltLight = new THREE.PointLight(0x34e27a, 6, 12);
    voltLight.position.set(coreOffsetX - 2.5, 1.5, 2.5);
    scene.add(voltLight);
    amberLight = new THREE.PointLight(0xf0c578, 1, 12);
    amberLight.position.set(coreOffsetX + 2.5, -1, 2);
    scene.add(amberLight);
  }

  const core = new THREE.Group();
  core.position.x = coreOffsetX; // offset off-center so it sits clear of the left-column headline
  scene.add(core);

  const innerMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 1),
    premiumCore
      ? new THREE.MeshPhysicalMaterial({
          color: 0x1c3b2a, metalness: 0.9, roughness: 0.3,
          clearcoat: 0.6, clearcoatRoughness: 0.25,
          emissive: 0x34e27a, emissiveIntensity: 0.06,
          envMapIntensity: 0.9, transparent: true, depthWrite: false,
          // flat-shaded on purpose: an icosahedron with smooth normals reads
          // as a sphere and loses the "faceted gem/reactor core" identity —
          // hard facet edges are the whole point here.
          flatShading: true,
          // holographic sheen — native PBR property, not a custom shader —
          // shifts color with viewing angle like an oil-slick/hologram card.
          iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400],
          // soft energy-field rim glow — also a native PBR property.
          sheen: 1, sheenColor: new THREE.Color(0x8cffb8), sheenRoughness: 0.3,
          normalMap: etchedNormalMap, normalScale: new THREE.Vector2(0.35, 0.35)
        })
      : new THREE.MeshBasicMaterial({ color: 0x34e27a, wireframe: true, transparent: true, opacity: 0.85 })
  );
  core.add(innerMesh);

  // Glowing edge outline on the faceted crystal only (not the smooth orb
  // below) — Tron-style circuit lines traced along the real facet edges,
  // child of innerMesh so it inherits its rotation and fades with it.
  let edgeLinesMat = null;
  if (premiumCore) {
    edgeLinesMat = new THREE.LineBasicMaterial({ color: 0x8cffb8, transparent: true, opacity: 0.9 });
    const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(innerMesh.geometry), edgeLinesMat);
    innerMesh.add(edgeLines);
  }

  // Scroll-driven metamorphosis (premiumCore only): the faceted "data
  // crystal" above cross-fades into a smooth "energy orb" as you scroll —
  // code/software (sharp, technical, volt-green) becoming released value
  // (warm, smooth, amber) — same brand duality already used everywhere
  // else on the site, just made literal in 3D instead of just in color.
  let orbMesh = null;
  if (premiumCore) {
    orbMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 4), // high subdivision = reads smooth, no flatShading
      new THREE.MeshPhysicalMaterial({
        color: 0x3a2a0c, metalness: 0.7, roughness: 0.28,
        clearcoat: 0.85, clearcoatRoughness: 0.15,
        emissive: 0xf0c578, emissiveIntensity: 0.1,
        envMapIntensity: 0.9, transparent: true, opacity: 0, depthWrite: false,
        iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [100, 400],
        sheen: 1, sheenColor: new THREE.Color(0xf0c578), sheenRoughness: 0.3,
        normalMap: etchedNormalMap, normalScale: new THREE.Vector2(0.2, 0.2)
      })
    );
    core.add(orbMesh);
  }

  // Tight "static energy" ring hugging the surface — denser, faster and
  // smaller than the outer particle shell further below, reads as energy
  // clinging to the core rather than orbiting debris.
  let energyRing = null;
  if (premiumCore) {
    const RING_N = 260;
    const ringPos = new Float32Array(RING_N * 3);
    const ringCol = new Float32Array(RING_N * 3);
    const ringPalette = [new THREE.Color(0x34e27a), new THREE.Color(0x8cffb8), new THREE.Color(0x2fd8ff)];
    for (let i = 0; i < RING_N; i++) {
      const r = 1.62 + Math.random() * 0.32;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      ringPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      ringPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      ringPos[i*3+2] = r * Math.cos(phi);
      const c = ringPalette[Math.floor(Math.random() * ringPalette.length)];
      ringCol[i*3] = c.r; ringCol[i*3+1] = c.g; ringCol[i*3+2] = c.b;
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
    ringGeo.setAttribute('color', new THREE.BufferAttribute(ringCol, 3));
    energyRing = new THREE.Points(ringGeo, new THREE.PointsMaterial({
      size: 0.026, vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    energyRing.position.x = coreOffsetX;
    scene.add(energyRing);
  }

  const outerMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.25, 0),
    new THREE.MeshBasicMaterial({ color: 0x2fd8ff, wireframe: true, transparent: true, opacity: 0.28 })
  );
  core.add(outerMesh);

  // energy particle shell — plain glow dots (a glyph-text version was tried
  // and reverted: at full scale it scattered over the headline/paragraph).
  const PCOUNT = 620;
  const positions = new Float32Array(PCOUNT * 3);
  const pcolors = new Float32Array(PCOUNT * 3);
  const palette = [
    new THREE.Color(0x34e27a), new THREE.Color(0x8cffb8),
    new THREE.Color(0xf0c578), new THREE.Color(0x2fd8ff)
  ];
  for (let i = 0; i < PCOUNT; i++) {
    const r = 2.7 + Math.random() * 1.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const c = palette[Math.floor(Math.random() * palette.length)];
    pcolors[i * 3] = c.r; pcolors[i * 3 + 1] = c.g; pcolors[i * 3 + 2] = c.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pcolors, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.045, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  particles.position.x = coreOffsetX;
  particles.userData.spin = 0.03;
  scene.add(particles);

  // circuit-board substrate the core visually plugs into — the code that powers it
  function makePcbTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(52,226,122,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      let x = Math.random() * 512, y = Math.random() * 512;
      ctx.beginPath(); ctx.moveTo(x, y);
      const segs = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segs; s++) {
        if (Math.random() > 0.5) { x += (Math.random() - 0.5) * 170; } else { y += (Math.random() - 0.5) * 170; }
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,197,120,0.75)'; ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }
  const pcbPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({
      map: makePcbTexture(), transparent: true, opacity: 0.42,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
    })
  );
  pcbPlane.rotation.x = -Math.PI / 2.25;
  pcbPlane.position.set(coreOffsetX, -2.3, -0.5);
  scene.add(pcbPlane);

  // ---- shared: soft glow dot used for every traveling pulse (bulletproof —
  // just an Object3D position updated per frame, not a shader-dependent trick;
  // LineDashedMaterial.dashOffset animation was tried first and turned out
  // unreliable, confirmed live: the core/particles rotated fine but nothing
  // "flowed" along the static dashed lines) ----
  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = makeGlowTexture();
  const flowDots = []; // { dot, curve, speed, offset } — driven every frame below

  function addFlowLine(points, color, { speed = 0.3, opacity = 0.4, size = 0.11, parent = scene } = {}) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    parent.add(new THREE.Line(geo, mat));

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    dot.scale.set(size, size, 1);
    parent.add(dot);
    flowDots.push({ dot, curve, speed, offset: Math.random() });
    return { mat };
  }

  // live feeder traces: rise from the board below and converge into the core +
  // the particle orbit around it, so the board visibly powers what's above it.
  const feederColors = [0x34e27a, 0xf0c578, 0x2fd8ff, 0x8cffb8];
  const FEEDER_N = 8;
  for (let i = 0; i < FEEDER_N; i++) {
    const spread = (i / (FEEDER_N - 1) - 0.5) * 6.2;
    const start = new THREE.Vector3(coreOffsetX + spread, -3.7 - Math.random() * 0.5, -0.9 + Math.random() * 1.8);
    const mid = new THREE.Vector3(coreOffsetX + spread * 0.5, -2.5, -0.3 + Math.random() * 0.6);
    const end = new THREE.Vector3(coreOffsetX + spread * 0.14, -1.5 + Math.random() * 0.3, 0);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    addFlowLine(curve.getPoints(50), feederColors[i % feederColors.length], { speed: 0.25 + Math.random() * 0.3, opacity: 0.4 });
  }

  // "echo" trace — one feeder literally draws this page's own real KPI steps
  // as a staircase (not an arbitrary shape): a genuine callback to real product
  // data, same trick used on the real site's hero charts.
  const echoStepX = 0.5, echoBaseY = -3.5, echoBaseX = coreOffsetX - (echoValues.length - 1) * echoStepX / 2;
  const echoPts = [];
  echoValues.forEach((v, i) => {
    const y = echoBaseY + (v / 100) * 1.5;
    const x = echoBaseX + i * echoStepX;
    if (i > 0) echoPts.push(new THREE.Vector3(x, echoPts[echoPts.length - 1].y, 0.7)); // riser
    echoPts.push(new THREE.Vector3(x, y, 0.7)); // tread
  });
  echoPts.push(new THREE.Vector3(coreOffsetX, -1.5, 0)); // tail curves up into the core
  addFlowLine(echoPts, 0x8cffb8, { speed: 0.3, opacity: 0.7, size: 0.14 });

  function makeLabelSprite(text, color) {
    const c = document.createElement('canvas');
    c.width = 560; c.height = 80;
    const ctx = c.getContext('2d');
    ctx.font = "500 32px 'Plex Mono', monospace";
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 4, 40);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.9, depthWrite: false }));
    sprite.scale.set(2.8, 0.4, 1);
    return sprite;
  }
  const echoLabelSprite = makeLabelSprite(echoLabel, '#8cffb8');
  echoLabelSprite.position.set(echoBaseX + 0.5, echoBaseY - 0.55, 0.7);
  scene.add(echoLabelSprite);

  // power cable feeding the core from off-screen — pages can flash `cableMat`
  // (returned below) when their own hero number lands, like index does on "4 000 €".
  const cableCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(coreOffsetX, -6, -0.3), new THREE.Vector3(coreOffsetX + 0.3, -3.5, 0.4), new THREE.Vector3(coreOffsetX, -1.6, 0)
  );
  const { mat: cableMat } = addFlowLine(cableCurve.getPoints(40), 0xf0c578, { speed: 0.22, opacity: 0.5, size: 0.13 });

  // pulsing plasma arcs riding real curved paths — parented to the core so
  // they also inherit its rotation on top of their own flow dot.
  const arcColors = [0x34e27a, 0xf0c578, 0x2fd8ff];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const start = new THREE.Vector3(Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0);
    const mid = new THREE.Vector3(Math.cos(a + 0.6) * 3.4, Math.sin(a + 0.6) * 3.4, (i - 1) * 0.8);
    const end = new THREE.Vector3(Math.cos(a + 1.2) * 1.55, Math.sin(a + 1.2) * 1.55, 0);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    addFlowLine(curve.getPoints(60), arcColors[i], { speed: 0.4 + i * 0.15, opacity: 0.5, size: 0.09, parent: core });
  }

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // premiumCore's solid lit surface is bright almost everywhere — a low
  // threshold tuned for thin wireframe lines blooms the whole sphere into
  // a soft blob and erases the facet reflections. Raise the threshold (and
  // trim the strength) so only genuine hotspots — direct light reflections —
  // bloom, not the whole lit surface.
  const bloom = premiumCore
    ? new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.55, 0.62)
    : new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.15, 0.7, 0.12);
  composer.addPass(bloom);

  let mouseX = 0, mouseY = 0;
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    // Lab is explicitly "push it to the max" — always full speed, regardless
    // of OS prefers-reduced-motion (unlike each page's own GSAP entrance/word
    // cycle, which still respects it for real accessibility).
    const speed = 1;

    core.rotation.y = t * 0.12 * speed;
    core.rotation.x = Math.sin(t * 0.08 * speed) * 0.15;
    outerMesh.rotation.y = -t * 0.07 * speed;
    particles.rotation.y = t * particles.userData.spin * speed;

    flowDots.forEach(f => {
      const frac = (t * f.speed * speed + f.offset) % 1;
      f.dot.position.copy(f.curve.getPointAt(frac));
    });

    // Based on the actual scrollable distance, not a fixed one-viewport
    // assumption — so the morph always completes by the bottom of the page,
    // whether the page is barely scrollable or several screens tall.
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const scrollProgress = Math.min(window.scrollY / maxScroll, 1);
    const targetZ = 7.2 - scrollProgress * 1.6;

    if (premiumCore && orbMesh) {
      innerMesh.material.opacity = 1 - scrollProgress;
      orbMesh.material.opacity = scrollProgress;
      if (edgeLinesMat) edgeLinesMat.opacity = 0.9 * (1 - scrollProgress);
      voltLight.intensity = 6 - 5 * scrollProgress;
      amberLight.intensity = 1 + 7 * scrollProgress;
      // breathing pulse — sine, not random, so it reads as alive/rhythmic
      // rather than flickery.
      const breathe = Math.sin(t * 1.2) * 0.04;
      innerMesh.material.emissiveIntensity = 0.06 + breathe;
      orbMesh.material.emissiveIntensity = 0.1 + breathe;
      if (energyRing) {
        energyRing.rotation.y = -t * 0.12;
        energyRing.rotation.x = t * 0.05;
      }
    }
    const targetX = reduceMotion ? 0 : mouseX * 0.35;
    const targetY = reduceMotion ? 0.2 : 0.2 - mouseY * 0.2;
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);

    composer.render();
  }
  animate();

  return { scene, core, camera, cableMat };
}

export function runBoot(lines, onDone) {
  const bootLinesEl = document.getElementById('bootLines');
  function typeLine(el, text, speed, cb) {
    let j = 0;
    const iv = setInterval(() => {
      el.textContent = text.slice(0, j + 1);
      j++;
      if (j >= text.length) { clearInterval(iv); cb && cb(); }
    }, speed);
  }
  let i = 0;
  function next() {
    if (i >= lines.length) { return setTimeout(onDone, 200); }
    const p = document.createElement('div');
    p.className = 'boot-line';
    bootLinesEl.appendChild(p);
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    typeLine(p, lines[i], 16, () => {
      p.appendChild(cursor);
      i++;
      setTimeout(() => { cursor.remove(); next(); }, 200);
    });
  }
  next();
}
