(() => {
  'use strict';
  // Static publishing: the entire immutable snapshot lives in the shared URL.
  // No cloud database, password, token, or GitHub API is required.
  const HISTORY_KEY = 'drzewko-opublikowane-linki-v1';
  const URL_LIMIT = 24000;
  const TREE_BYTES_LIMIT = 240000;
  const CODE_LIMIT = 34000;

  function encode64url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode64url(value) {
    if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error('Nieprawidłowy kod publikacji');
    }
    let binary;
    try { binary = atob(value.replace(/-/g, '+').replace(/_/g, '/')); }
    catch { throw new Error('Uszkodzony adres publikacji'); }
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  async function streamBytes(stream, maxLength) {
    const reader = stream.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.byteLength;
        if (length > maxLength) {
          await reader.cancel();
          throw new Error('Publikacja jest zbyt duża, aby otworzyć ją z linku');
        }
        chunks.push(next.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let index = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, index);
      index += chunk.byteLength;
    }
    return bytes;
  }
  async function makeLink(tree) {
    const raw = new TextEncoder().encode(JSON.stringify(tree));
    if (raw.byteLength > TREE_BYTES_LIMIT) {
      throw new Error('Drzewko jest za duże. Użyj eksportu JSON.');
    }
    let encoded = raw;
    let codec = 'j';
    if (typeof CompressionStream === 'function') {
      try {
        const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
        const smaller = await streamBytes(stream, TREE_BYTES_LIMIT);
        if (smaller.byteLength < raw.byteLength) {
          encoded = smaller;
          codec = 'g';
        }
      } catch (error) { console.warn('Kompresja niedostępna:', error); }
    }
    const url = new URL('index.html', window.location.href);
    url.search = '';
    url.hash = 'pub=' + codec + '.' + encode64url(encoded);
    if (url.href.length > URL_LIMIT) {
      throw new Error('Adres publikacji jest za długi. Użyj eksportu JSON.');
    }
    return url.href;
  }
  async function readLink() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (!params.has('pub')) return null;
    const encoded = params.get('pub') || '';
    if (encoded.length > CODE_LIMIT) throw new Error('Link publikacji jest zbyt duży');
    const split = encoded.indexOf('.');
    if (split < 0) throw new Error('Nieprawidłowy format linku');
    const codec = encoded.slice(0, split);
    let bytes = decode64url(encoded.slice(split + 1));
    if (bytes.byteLength > TREE_BYTES_LIMIT) throw new Error('Przekroczono rozmiar drzewka');
    if (codec === 'g') {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('Przeglądarka nie obsługuje otwierania skompresowanych linków');
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = await streamBytes(stream, TREE_BYTES_LIMIT);
    } else if (codec !== 'j') throw new Error('Nieznany format publikacji');
    let parsed;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)); }
    catch { throw new Error('Uszkodzone dane w linku'); }
    return parsed;
  }
  const SHORTENER_CACHE_KEY = 'drzewko-skrocone-linki-v1';
  function getShortCache() {
    try {
      const rows = JSON.parse(localStorage.getItem(SHORTENER_CACHE_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(row =>
        row && typeof row.original === 'string' &&
        typeof row.short === 'string').slice(0,20) : [];
    } catch { return []; }
  }
  /**
   * Skrócenie jest wywoływane raz, wyłącznie po kliknięciu "Publikuj".
   * is.gd udostępnia JSONP, dzięki czemu działa z GitHub Pages bez CORS i backendu.
   * Przekazujemy zewnętrznej usłudze pełen (publiczny) URL publikacji.
   */
  function shortenLink(original) {
    if (!/^https:\/\/hogcraft2-cpu\.github\.io\/drzewko\//.test(original)) {
      return Promise.reject(new Error('Nieprawidłowy adres publikacji'));
    }
    if (original.length > 5000) {
      return Promise.reject(new Error('Pełny adres przekracza limit 5000 znaków usługi is.gd'));
    }
    const cached = getShortCache().find(row => row.original === original);
    if (cached && /^https:\/\/is\.gd\/[A-Za-z0-9_]+$/.test(cached.short)) {
      return Promise.resolve(cached.short);
    }
    return new Promise((resolve, reject) => {
      const callback = '__drzewkoShort' +
        Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      const script = document.createElement('script');
      let finished = false;
      let timer;
      function finish(error, value) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        script.remove();
        try { delete window[callback]; } catch { window[callback] = undefined; }
        if (error) reject(error);
        else resolve(value);
      }
      window[callback] = data => {
        if (data && typeof data.shorturl === 'string' &&
            /^https:\/\/is\.gd\/[A-Za-z0-9_]+$/.test(data.shorturl)) {
          const items = [
            { original, short:data.shorturl }, ...getShortCache().filter(x => x.original !== original)
          ].slice(0,20);
          try { localStorage.setItem(SHORTENER_CACHE_KEY, JSON.stringify(items)); }
          catch { /* Pamięć podręczna jest opcjonalna. */ }
          finish(null, data.shorturl);
        } else {
          finish(new Error(data?.errormessage || 'Serwis skracania nie zwrócił linku'));
        }
      };
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      script.onerror = () => finish(new Error('Usługa skracania jest niedostępna'));
      const api = new URL('https://is.gd/create.php');
      api.searchParams.set('format', 'json');
      api.searchParams.set('url', original);
      api.searchParams.set('callback', callback);
      script.src = api.href;
      timer = setTimeout(() => finish(new Error('Przekroczono czas łączenia z is.gd')), 12000);
      document.head.appendChild(script);
    });
  }

  function history() {
    try {
      const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(list) ? list.filter(item =>
        item && typeof item.url === 'string' && typeof item.title === 'string'
      ).slice(0, 20) : [];
    } catch { return []; }
  }
  function remember(url, title, count) {
    const data = [{
      url, title: String(title || 'Drzewko').slice(0, 100),
      count: Number(count) || 0, savedAt: new Date().toISOString()
    }, ...history().filter(item => item.url !== url)].slice(0, 20);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(data)); }
    catch { /* User can still copy or download the link manually. */ }
  }
  window.DrzewkoLinks = { makeLink, readLink, shortenLink, remember, history, isPublished: () =>
    new URLSearchParams(window.location.hash.slice(1)).has('pub') };
})();