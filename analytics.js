'use strict';
// Site analytics (site-track, RGPD-friendly, no third-party cookie). Ported
// from js/reactor-lab.js's initAnalytics(): same endpoint, same opt-out
// mechanism (?ff_notrack=1, persisted in localStorage), same event
// classification by link destination rather than button label. Plain script
// (no ES module) so a single <script src="analytics.js" defer> works
// identically on every page, blog included.
(function initAnalytics() {
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

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    // endsWith rather than startsWith: the blog page links to "../contact.html"
    // (one level up), not "contact.html" — startsWith would silently miss it.
    if (href.endsWith('contact.html')) {
      window.forthecTrack('click_contact');
    } else if (href.includes('app.forthec.fr') && href.includes('demo=')) {
      window.forthecTrack('click_demo');
    } else if (link.hasAttribute('download')) {
      window.forthecTrack('download');
    }
  });
})();
