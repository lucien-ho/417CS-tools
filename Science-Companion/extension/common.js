(() => {
  'use strict';
  const PORTS = new Set(['8990', '8765', '8000']);
  function scienceOrigin(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)
        && PORTS.has(u.port) && !u.username && !u.password ? u.origin : null;
    } catch { return null; }
  }
  function exportUrl(value, pageUrl) {
    const origin = scienceOrigin(pageUrl);
    if (!origin) return false;
    try {
      const u = new URL(value, pageUrl);
      return u.protocol === 'blob:' ? u.origin === origin
        : u.origin === origin && !u.username && !u.password;
    } catch { return false; }
  }
  function markdownName(value) {
    const raw = String(value || 'science-document.md').normalize('NFC');
    const name = raw.split(/[\\/]/).pop().replace(/[<>:"|?*\x00-\x1f\x7f]/g, '_').trim();
    if (!/\.(md|markdown)$/i.test(name)) throw new Error('仅支持 Markdown 文件');
    const stem = name.replace(/\.(md|markdown)$/i, '').replace(/[ .]+$/g, '').slice(0, 100) || 'science-document';
    return (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem) ? '_' : '') + stem + '.md';
  }
  function validPayload(message) {
    return message && message.action === 'openMarkdown' && ['default', 'choose', 'reveal'].includes(message.mode)
      && typeof message.filename === 'string' && message.filename.length <= 200
      && typeof message.base64 === 'string' && message.base64.length > 0
      && message.base64.length <= 5592408 && message.base64.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(message.base64);
  }
  globalThis.ScienceCompanionCore = { scienceOrigin, exportUrl, markdownName, validPayload, MAX_BYTES: 4 * 1024 * 1024 };
})();
