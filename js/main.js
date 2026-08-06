// ── Reveal on scroll ─────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ── Compteur animé ────────────────────────
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 1400;
  const start = performance.now();
  const isNeg = target < 0;
  const abs = Math.abs(target);

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = abs * ease;
    const display = Number.isInteger(target) ? Math.round(val) : val.toFixed(1);
    el.textContent = prefix + (isNeg ? '-' : '') + display + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

// ── Nav active state ──────────────────────
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

// ── Menu mobile (hamburger) ───────────────
// Injecté en JS plutôt que dupliqué dans les 16 pages HTML -- une seule
// source de vérité, même pattern que l'app-switcher ci-dessous. Corrige un
// vrai bug : sous 768px, .nav-links passait en display:none (css/style.css)
// sans aucun bouton pour le rouvrir -- la navigation disparaissait purement
// et simplement sur mobile/tablette.
(function () {
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
  // Repasser en desktop (rotation, fenêtre agrandie) sans laisser le tiroir
  // ouvert affiché en position:fixed derrière le nav horizontal.
  window.addEventListener('resize', () => { if (window.innerWidth > 768) setOpen(false); });
})();

// ── App switcher (Console / Energy) ───────
(function () {
  const STORAGE_KEY = 'forthec-app-switcher-open';

  const wrap = document.createElement('div');
  wrap.className = 'app-switcher';
  wrap.innerHTML = `
    <div class="app-switcher-panel">
      <h4>Nos applications</h4>
      <a class="app-switcher-link" href="https://console-app.forthec.fr/" target="_blank" rel="noopener">🖥 Console</a>
      <a class="app-switcher-link" href="https://app.forthec.fr/" target="_blank" rel="noopener">⚡ Energy</a>
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
})();

// ── Analytics maison (site_events, RGPD-friendly, pas de cookie tiers) ────
// Opt-out perso : visiter une fois une page avec ?ff_notrack=1 (ex. après un
// clic sur un lien de prospection qu'on teste soi-même) désactive tout
// tracking sur ce navigateur, de façon permanente (localStorage, pas lié à
// l'IP qui change selon le réseau). ?ff_notrack=0 réactive.
window.forthecTrack = (function () {
  const NOTRACK_KEY = 'forthec_notrack';
  const VISITOR_KEY = 'forthec_visitor_id';
  const SESSION_KEY = 'forthec_session_id';
  const TRACK_ENDPOINT = 'https://ofsmrflyjxrxmwcndymt.supabase.co/functions/v1/site-track';

  const params = new URLSearchParams(window.location.search);
  if (params.has('ff_notrack')) {
    localStorage.setItem(NOTRACK_KEY, params.get('ff_notrack') === '1' ? '1' : '0');
  }
  const isOptedOut = localStorage.getItem(NOTRACK_KEY) === '1';

  function getOrCreate(storage, key) {
    let value = storage.getItem(key);
    if (!value) {
      value = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      storage.setItem(key, value);
    }
    return value;
  }

  function track(eventType, extra) {
    if (isOptedOut) return;

    const visitorId = getOrCreate(localStorage, VISITOR_KEY);
    const sessionId = getOrCreate(sessionStorage, SESSION_KEY);

    const payload = Object.assign({
      event_type: eventType,
      page_url: window.location.pathname + window.location.search,
      page_title: document.title,
      session_id: sessionId,
      visitor_id: visitorId,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    }, extra || {});

    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Analytics best-effort : un échec réseau ne doit jamais impacter la navigation.
    });
  }

  if (!isOptedOut) track('pageview');

  return track;
})();

// ── Clics CTA (click_contact / click_demo) ────────────────────────────────
// Classé par destination du lien, pas par le libellé du bouton : tout ce qui
// mène vers contact.html est un "clic contact" (ex. "Demander une démo" qui
// arrive en fait sur le formulaire de contact), tout ce qui mène vers
// app.forthec.fr en mode démo (?demo=...) est un "clic démo" (essai direct
// sans passer par le formulaire).
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href') || '';
  if (href.startsWith('contact.html')) {
    window.forthecTrack('click_contact');
  } else if (href.includes('app.forthec.fr') && href.includes('demo=')) {
    window.forthecTrack('click_demo');
  }
});
