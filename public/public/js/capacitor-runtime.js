/* Termini Pro - Capacitor runtime bridge
   Ovo omogućava da isti HTML/CSS/JS radi i kao web na Render-u i kao Android app preko Capacitor-a.
   Ako tvoj Render link nije https://termini-platforma.onrender.com, promeni DEFAULT_API_BASE ispod. */
(function () {
  'use strict';

  var DEFAULT_API_BASE = 'https://termini-platforma.onrender.com';

  function hasCapacitor() {
    try {
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return window.Capacitor.isNativePlatform();
      }
      return !!window.Capacitor;
    } catch (e) {
      return false;
    }
  }

  function looksLikeAndroidWebView() {
    var ua = navigator.userAgent || '';
    return location.hostname === 'localhost' && /Android/i.test(ua) && /wv/i.test(ua);
  }

  function isNativeApp() {
    return hasCapacitor() || location.protocol === 'capacitor:' || looksLikeAndroidWebView();
  }

  function cleanBase(v) {
    return String(v || '').trim().replace(/\/+$/, '');
  }

  var storedBase = '';
  try { storedBase = localStorage.getItem('TERMINI_API_BASE') || ''; } catch (e) {}

  var apiBase = cleanBase(window.TERMINI_API_BASE || storedBase || DEFAULT_API_BASE);
  window.TERMINI_API_BASE = apiBase;
  window.terminiIsNativeApp = isNativeApp;

  window.terminiSetApiBase = function (url) {
    var clean = cleanBase(url);
    if (!clean) return;
    window.TERMINI_API_BASE = clean;
    try { localStorage.setItem('TERMINI_API_BASE', clean); } catch (e) {}
  };

  window.terminiAppPath = function (path) {
    if (!isNativeApp()) return path;
    if (path === '/' || path === '') return '/index.html';
    if (path === '/tablet') return '/tablet.html';
    return path;
  };

  function rewriteUrl(value) {
    if (!isNativeApp() || !apiBase) return value;
    if (typeof value !== 'string') return value;

    // API mora da ide na Render backend, jer Android app nema lokalni Node server.
    if (value.indexOf('/api/') === 0) return apiBase + value;

    // Dinamički linkovi se otvaraju preko pravog web servera.
    if (value.indexOf('/b/') === 0 || value.indexOf('/m/') === 0 || value.indexOf('/w/') === 0) {
      return apiBase + value;
    }

    return value;
  }

  var originalFetch = window.fetch ? window.fetch.bind(window) : null;
  if (originalFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        return originalFetch(rewriteUrl(input), init);
      }
      try {
        if (input && input.url && typeof input.url === 'string') {
          var currentOrigin = location.origin;
          if (input.url.indexOf(currentOrigin + '/api/') === 0) {
            input = new Request(apiBase + input.url.slice(currentOrigin.length), input);
          }
        }
      } catch (e) {}
      return originalFetch(input, init);
    };
  }

  // Linkovi koji na serveru postoje kao /tablet, /b/... itd. U lokalnoj aplikaciji ih preusmeravamo pravilno.
  document.addEventListener('click', function (ev) {
    if (!isNativeApp()) return;
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;

    try {
      var u = new URL(href, location.href);
      if (u.origin !== location.origin) return;
      if (u.pathname === '/' || u.pathname === '/tablet') {
        ev.preventDefault();
        location.href = window.terminiAppPath(u.pathname) + u.search + u.hash;
        return;
      }
      if (u.pathname.indexOf('/b/') === 0 || u.pathname.indexOf('/m/') === 0 || u.pathname.indexOf('/w/') === 0) {
        ev.preventDefault();
        location.href = apiBase + u.pathname + u.search + u.hash;
      }
    } catch (e) {}
  }, true);
})();
