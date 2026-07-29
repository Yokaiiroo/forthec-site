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
