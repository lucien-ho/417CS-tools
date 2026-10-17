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
    if (!replacement && key.length > 0 && key.length < 3000) {
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
  const fileMenus = '[role="menu"][aria-label="Artifact actions"],[role="menu"][aria-label="文件操作"],[role="menu"][aria-label="File actions"],[data-testid="file-context-menu"]';
  async function locate(menu) {
    return await chrome.runtime.sendMessage({action:'resolveFile',menuId:menu.dataset.scompMenu}) || {kind:'unknown'};
  }
  async function nativeOpen(payload, storage) {
    const result = await chrome.runtime.sendMessage(payload);
    if (!result?.ok) throw new Error(result?.error || '本地组件未确认打开；请更新本地组件。');
    showToast((result.cancelled ? '已取消打开。' : payload.mode === 'reveal' ? (storage==='science'?'已定位 Science 内部存储文件。':'已定位原文件。') : result.copyOnly ? '已打开缓存副本；外部修改不会同步回 Science。' : (storage==='science'?'已直接打开 Science 内部存储文件，未创建副本。\n直接保存修改可能影响 Science 的版本校验。':'已交给 Windows 打开原文件；外部编辑会修改该文件。')) + (result.path ? '\n'+result.path : ''));
  }
  function beginCapture(download, mode) {
    return new Promise((resolve,reject)=>{
      const request = {mode,timer:null,resolve,reject}; pending=request;
      request.timer=setTimeout(()=>{if(pending===request){pending=null;reject(new Error('未能识别当前文件。请在 Science 的 Files 中打开原文件后重试。'));}},20000);
      try {download.click();} catch(error){clearTimeout(request.timer);pending=null;reject(error);}
    });
  }
  function copyConsent() {
    return window.confirm('当前文件没有可直接打开的本机原文件路径（可能是服务器文件、上传附件或历史版本）。是否保存一份缓存副本并用外部应用打开？相同内容会复用缓存，外部修改不会同步回 Science。');
  }
  function addMenuActions(menu) {
    if (menu.querySelector('[data-scomp-action]')) return;
    const download = [...menu.querySelectorAll('button,[role="menuitem"]')].find(button =>
      /^(Download|下载)(?:\s*\.[a-z0-9]+)?$/i.test(originalLabel(button)));
    // Standalone PDF (and other non-markdown previews) omit ordinary Download.
    // The exact Science file-menu selector is sufficient; copying is optional.
    menu.dataset.scompMenu = crypto.randomUUID();
    for (const [mode, cn, en] of [['default','用默认应用打开','Open in default app'],['choose','选择其他应用打开','Open with another app'],['reveal','在文件资源管理器中显示','Show in File Explorer']]) {
      const button = document.createElement('button'); button.type='button';button.setAttribute('role','menuitem');
      button.className=download?.className || '';button.dataset.scompAction=mode;button.textContent=enabled?cn:en;
      button.title=mode==='reveal'?'定位当前版本的实际磁盘文件，包括 Science 内部存储；不下载副本':'直接打开当前版本的实际磁盘文件，包括 Science 内部存储';
      button.style.cssText='display:flex;align-items:center;width:100%;text-align:left;padding:10px 12px;cursor:pointer;';
      button.addEventListener('click',async event=>{
        event.preventDefault();event.stopPropagation();
        if(!event.isTrusted || !isScience())return;
        if(pending || opening){showToast('已有打开操作正在进行。');return;}
        opening=true;
        try {
          showToast('正在查找当前文件及版本的真实存储位置…');
          const target=await locate(menu);
          if(target.kind==='multiple')throw new Error('请一次选择一个文件。');
          if(target.kind==='local') {
            if(!core.localPath(target.path))throw new Error('此路径不在本机 Windows 磁盘上，无法直接打开：'+target.path);
            await nativeOpen({action:'openFile',path:target.path,mode},target.storage);
          } else if(mode==='reveal' || target.kind==='unknown') {
            throw new Error(target.kind==='remote'?'文件位于服务器，Windows 文件资源管理器无法直接定位。请在 Science 的 Files 中查看服务器目录。没有下载副本。':target.reason || '插件未能识别当前菜单对应的文件或版本。请关闭此菜单，重新打开文件预览后再试。没有下载副本。');
          } else if(download && copyConsent()) { await beginCapture(download,mode); }
          else if(!download)throw new Error('没有本机路径或可用的下载入口。请在 Files 中打开原文件后重试。');
        } catch(error){showToast(error.message || '无法打开文件',true);}
        finally {opening=false;}
      });
      if(download)download.before(button);else menu.append(button);
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
      if (length > core.MAX_BYTES) throw new Error('缓存打开支持 64 MiB 以内的文件；更大文件请使用原有下载功能，本机原文件不受此限制');
      if (!filename) {
        const disposition = response.headers.get('Content-Disposition') || '';
        const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition);
        filename = encoded ? decodeURIComponent(encoded[1]) : plain ? (plain[1]||plain[2]).trim() : 'science-file';
      }
      filename = core.fileName(filename);
      const reader = response.body.getReader(), chunks=[]; let size=0;
      try { while(true) {const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>core.MAX_BYTES)throw new Error('缓存打开支持 64 MiB 以内的文件；更大文件请使用原有下载功能，本机原文件不受此限制');chunks.push(value);} }
      finally {await reader.cancel().catch(()=>{});}
      const bytes = new Uint8Array(size); let offset=0;
      for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      let binary=''; for(let index=0;index<bytes.length;index+=16384)binary+=String.fromCharCode(...bytes.subarray(index,index+16384));
      return {filename,base64:btoa(binary)};
    } finally {clearTimeout(timer);}
  }
  document.addEventListener('click', event => {
    const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;
    if(!pending || !anchor || !core.exportUrl(anchor.href,location.href))return;
    const request=pending;pending=null;clearTimeout(request.timer);opening=true;
    event.preventDefault();event.stopImmediatePropagation();
    // The user explicitly accepted a copy. Reveal never enters this path.
    readExport(anchor.href,anchor.download).then(payload=>nativeOpen({action:'openCopy',mode:request.mode,...payload}))
      .then(request.resolve,request.reject);
  },true);
  function scan() {
    scheduled=false;if(!isScience())return;
    for(const node of texts.keys())if(!node.isConnected)texts.delete(node);
    for(const element of attributes.keys())if(!element.isConnected)attributes.delete(element);
    if(enabled){
      // Match only reviewed static UI strings. Traverse paragraphs, headings,
      // tooltips and portals too; prune complete user/document subtrees.
      if (document.body) translateControl(document.body);
      document.querySelectorAll('[aria-label],[aria-description],[title],[placeholder]').forEach(element=>{
        if(element.closest(protectedContent))return;
        for(const name of ['aria-label','aria-description','title','placeholder']){
          const before=element.getAttribute(name);if(!before)continue;const after=translated(before);
          if(before!==after){const values=attributes.get(element)||{};values[name]={before,after};attributes.set(element,values);element.setAttribute(name,after);}
        }
      });
    }
    document.querySelectorAll(fileMenus).forEach(addMenuActions);
    observer.takeRecords(); // Ignore our own text/attribute edits, not future app mutations.
  }
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(scan);}};
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      // UI menus can be mounted inside protected conversation/document content.
      // Keep their file controls working without translating the document body.
      return !element?.closest(excluded) || !!element?.closest(fileMenus) ||
        [...record.addedNodes].some(node=>node.nodeType===Node.ELEMENT_NODE &&
          (node.matches(fileMenus) || node.querySelector(fileMenus)));
    })) schedule();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','aria-description','title','placeholder']});
  chrome.storage.local.get({chinese:true}).then(value=>{enabled=value.chinese!==false;schedule();});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes.chinese)return;enabled=changes.chinese.newValue!==false;if(!enabled)restore();
    document.querySelectorAll('[data-scomp-action]').forEach(button=>button.remove());schedule();
  });
})();
