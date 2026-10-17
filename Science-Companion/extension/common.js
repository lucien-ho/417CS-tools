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
  function fileName(value) {
    const name = String(value || 'science-file').normalize('NFC').split(/[\\/]/).pop()
      .replace(/[<>:"|?*\x00-\x1f\x7f]/g, '_').replace(/[ .]+$/g, '');
    if (!name || name.length > 180) throw new Error('文件名为空或过长');
    return (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? '_' : '') + name;
  }
  function localPath(value) {
    return typeof value === 'string' && value.length <= 4096 && /^[A-Za-z]:[\\/]/.test(value)
      && !/[\x00-\x1f<>"|?*]/.test(value) && !value.slice(2).includes(':');
  }
  function validPayload(m) {
    if (!m || !['default','choose','reveal'].includes(m.mode)) return false;
    if (m.action === 'openFile') return localPath(m.path) && Object.keys(m).length === 3;
    if (m.action === 'openCopy') return m.mode !== 'reveal' && Object.keys(m).length === 4
      && typeof m.filename === 'string' && m.filename.length <= 200
      && typeof m.base64 === 'string' && m.base64.length <= 89478488
      && m.base64.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(m.base64);
    return false;
  }
  globalThis.ScienceCompanionCore = { scienceOrigin, exportUrl, fileName, localPath, validPayload, MAX_BYTES:64*1024*1024 };
})();
