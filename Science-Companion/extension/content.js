(() => {
  'use strict';
  const core = ScienceCompanionCore;
  if (!core.scienceOrigin(location.href) || window.top !== window) return;
  const translations = Object.assign(Object.create(null), ScienceCompanionTranslations, ScienceCompanionCatalog);
  const texts = new Map(), attributes = new Map();
  const protectedContent = 'pre,code,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],.monaco-editor,.cm-editor,.prose,.markdown,.markdown-body,.font-claude-response,[data-message-content],[data-ann-source],[data-testid="user-message"],[data-testid^="subagent-user-message"],[data-scomp-root],svg,[data-cds="Icon"],[aria-hidden="true"],script,style,iframe,object,embed,td,[data-testid="authorship-line"],[role="button"] .truncate';
  const excluded = protectedContent + ',input,[role="button"]:not(button)';
  const normalized = value => value.replace(/\s+/g, ' ').trim();
  const dictionary = new Map(Object.entries(translations).map(([key,value]) => [normalized(key),value]));
  const templates = Object.entries(translations).filter(([key]) => /\{[a-zA-Z]+\}/.test(key)).map(([key,value]) => {
    const names = [], parts = normalized(key).split(/(\{[a-zA-Z]+\})/);
    const pattern = parts.map(part => {
      if (/^\{[a-zA-Z]+\}$/.test(part)) { names.push(part); return '(.{1,300}?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return {regex:new RegExp('^'+pattern+'$'),names,value};
  });
  let enabled = true, scheduled = false, pending = null, opening = false, toast = null;
  const isScience = () => /Claude Science/i.test(document.title);
  function translated(value) {
    const trimmed = value.trim(), key = normalized(trimmed);
    const counted = /^(All|Personal|Built-in|Skills|Connectors|Specialists)\s*\((\d+)\)$/.exec(key);
    let replacement = dictionary.get(key) || (counted && `${dictionary.get(counted[1])}（${counted[2]}）`);
    if (!replacement && key.length > 30 && key.length < 3000) {
      for (const template of templates) {
        const match = template.regex.exec(key); if (!match) continue;
        const values = new Map(template.names.map((name,index)=>[name,match[index+1]]));
        replacement = template.value.replace(/\{[a-zA-Z]+\}/g, name => values.get(name) || name); break;
      }
    }
    return replacement ? value.replace(trimmed, () => replacement) : value;
  }
  function translateControl(element) {
    if (element.closest(excluded)) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE) return node.matches(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest(excluded)) continue;
      const before = node.nodeValue, after = translated(before);
      if (before !== after) { texts.set(node, {before, after}); node.nodeValue = after; }
    }
  }
  function restore() {
    for (const [node, value] of texts) if (node.isConnected && node.nodeValue === value.after) node.nodeValue = value.before;
    for (const [element, values] of attributes) for (const [name, value] of Object.entries(values)) {
      if (element.isConnected && element.getAttribute(name) === value.after) element.setAttribute(name, value.before);
    }
    texts.clear(); attributes.clear();
  }
  function originalLabel(button) {
    // Science uses font glyphs in aria-hidden Icon spans, not just SVG icons.
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    const parts = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest('svg,[data-cds="Icon"],[aria-hidden="true"],[hidden],.sr-only')) continue;
      parts.push(texts.get(node)?.before || node.nodeValue);
    }
    return parts.join('').replace(/\s+/g, ' ').trim();
  }
  function showToast(message, bad = false) {
    toast?.remove();
    toast = document.createElement('div'); toast.dataset.scompRoot = 'toast';
    const shadow = toast.attachShadow({mode:'closed'});
    const style = document.createElement('style');
    style.textContent = ':host{position:fixed;right:20px;bottom:20px;z-index:2147483647;max-width:460px;font:14px/1.6 system-ui,sans-serif}section{background:#fffaf3;color:#292620;border:1px solid #d7cbbd;box-shadow:0 6px 28px #0002;border-radius:12px;padding:14px 38px 14px 16px;white-space:pre-wrap;overflow-wrap:anywhere}button{position:absolute;right:9px;top:8px;background:none;border:0;cursor:pointer;color:#655c51;font-size:20px}';
    const body = document.createElement('section'); body.textContent = message; body.setAttribute('role',bad?'alert':'status');
    const close = document.createElement('button'); close.textContent = '×'; close.title = '关闭'; close.onclick = () => toast?.remove();
    shadow.append(style,body,close); document.documentElement.append(toast);
  }
  function addMenuActions(menu) {
    if (menu.querySelector('[data-scomp-action]')) return;
    const download = [...menu.querySelectorAll('button,[role="menuitem"]')].find(button =>
      /^(Download|下载)\s*\.(md|markdown)$/i.test(originalLabel(button)));
    if (!download) return;
    for (const [mode, cn, en] of [['default','用默认应用打开 .md','Open .md in default app'],['choose','选择其他应用打开 .md','Open .md with another app'],['reveal','在文件资源管理器中显示','Show in File Explorer']]) {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role','menuitem');
      button.className = download.className; button.dataset.scompAction = mode; button.textContent = enabled ? cn : en;
      button.title = '导出当前 Markdown 的本地副本；外部修改不会自动同步回 Science';
      button.style.cssText = 'display:flex;align-items:center;width:100%;text-align:left;padding:10px 12px;cursor:pointer;';
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        if (!event.isTrusted || !isScience()) return;
        if (pending || opening) {showToast('已有打开操作正在进行。');return;}
        const request = {mode, timer:null}; pending = request;
        request.timer = setTimeout(() => {if(pending===request){pending=null;showToast('未收到 Markdown 导出。请使用原有“下载 .md”，或检查 Science 是否升级了导出方式。',true);}},20000);
        showToast('正在导出 Markdown 副本…');
        download.click();
      });
      download.before(button);
    }
    menu.style.maxHeight = 'calc(100vh - 16px)'; menu.style.overflowY = 'auto';
    requestAnimationFrame(() => {
      if (!menu.isConnected) return;
      const box = menu.getBoundingClientRect();
      if (getComputedStyle(menu).position === 'fixed') {
        if (box.bottom > innerHeight - 8) menu.style.top = `${Math.max(8, innerHeight - box.height - 8)}px`;
        if (box.right > innerWidth - 8) menu.style.left = `${Math.max(8, innerWidth - box.width - 8)}px`;
      }
    });
  }
  async function readExport(url, filename) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),15000);
    try {
      const response = await fetch(url,{credentials:'same-origin',redirect:'error',signal:controller.signal});
      if (!response.ok || !response.body) throw new Error('Science 导出失败');
      const length = Number(response.headers.get('Content-Length') || 0);
      if (length > core.MAX_BYTES) throw new Error('文件超过 4 MiB，请使用原有下载功能');
      if (!filename) {
        const disposition = response.headers.get('Content-Disposition') || '';
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition);
        filename = encoded ? decodeURIComponent(encoded[1]) : plain ? (plain[1]||plain[2]).trim() : 'science-document.md';
      }
      filename = core.markdownName(filename);
      const reader = response.body.getReader(), chunks=[]; let size=0;
      try { while(true) {const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>core.MAX_BYTES)throw new Error('文件超过 4 MiB，请使用原有下载功能');chunks.push(value);} }
      finally {await reader.cancel().catch(()=>{});}
      if (!size) throw new Error('导出的文件为空');
      const bytes = new Uint8Array(size); let offset=0;
      for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      let binary=''; for(let index=0;index<bytes.length;index+=16384)binary+=String.fromCharCode(...bytes.subarray(index,index+16384));
      return {filename,base64:btoa(binary)};
    } finally {clearTimeout(timer);}
  }
  document.addEventListener('click', event => {
    const anchor = event.target instanceof Element ? event.target.closest('a[download]') : null;
    if (!pending || !anchor) return;
    if (!core.exportUrl(anchor.href,location.href)) return;
    if (anchor.download && !/\.(md|markdown)$/i.test(anchor.download)) return;
    const request=pending;pending=null;clearTimeout(request.timer);opening=true;
    event.preventDefault();event.stopImmediatePropagation();
    // Start fetching before Science revokes its one-use blob URL after a.click().
    readExport(anchor.href,anchor.download).then(payload => chrome.runtime.sendMessage({action:'openMarkdown',mode:request.mode,...payload}))
      .then(result => {
        if(!result?.ok)throw new Error(result?.error||'本地应用未确认打开');
        showToast((result.cancelled?'已取消应用选择，副本已保存。':request.mode==='reveal'?'已在文件资源管理器中显示导出的副本。':'已交给外部应用打开。')+'\n'+result.path+'\n外部修改不会自动同步回 Science。');
      }).catch(error=>showToast(error.message||'无法打开文件，请使用原有下载功能。',true))
      .finally(()=>{opening=false;});
  },true);
  function scan() {
    scheduled=false;if(!isScience())return;
    for(const node of texts.keys())if(!node.isConnected)texts.delete(node);
    for(const element of attributes.keys())if(!element.isConnected)attributes.delete(element);
    if(enabled){
      // Match only reviewed static UI strings. Traverse paragraphs, headings,
      // tooltips and portals too; prune complete user/document subtrees.
      if (document.body) translateControl(document.body);
      document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(element=>{
        if(element.closest(protectedContent))return;
        for(const name of ['aria-label','title','placeholder']){
          const before=element.getAttribute(name);if(!before)continue;const after=translated(before);
          if(before!==after){const values=attributes.get(element)||{};values[name]={before,after};attributes.set(element,values);element.setAttribute(name,after);}
        }
      });
    }
    document.querySelectorAll('[role="menu"][aria-label="Artifact actions"],[role="menu"][aria-label="文件操作"]').forEach(addMenuActions);
    observer.takeRecords(); // Ignore our own text/attribute edits, not future app mutations.
  }
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(scan);}};
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      return !element?.closest(excluded);
    })) schedule();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});
  chrome.storage.local.get({chinese:true}).then(value=>{enabled=value.chinese!==false;schedule();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes.chinese)return;enabled=changes.chinese.newValue!==false;if(!enabled)restore();
    document.querySelectorAll('[data-scomp-action]').forEach(button=>button.remove());schedule();
  });
})();
