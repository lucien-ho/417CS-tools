'use strict';
importScripts('common.js','resolve-file.js');
const HOST = 'com.csswitch.science_companion';
const busyTabs = new Set();
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const core = ScienceCompanionCore;
  const popup = sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
  const origin = core.scienceOrigin(sender.url);
  const page = sender.id === chrome.runtime.id && sender.frameId === 0 && Number.isInteger(sender.tab?.id)
    && origin && (!sender.origin || sender.origin === origin);
  if (message?.action === 'probe' && popup) {
    chrome.runtime.sendNativeMessage(HOST, {action:'probe'}).then(reply, () => reply({ok:false,error:'本地打开组件尚未安装。请运行安装脚本。'}));
    return true;
  }
  if (page && message?.action === 'resolveFile' && typeof message.menuId === 'string' && /^[a-z0-9-]{1,80}$/.test(message.menuId)) {
    chrome.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[0]},world:'MAIN',func:resolveScienceFile,args:[message.menuId]})
      .then(results => reply(results[0]?.result || {kind:'unknown'}), () => reply({kind:'unknown'}));
    return true;
  }
  if (!page || !core.validPayload(message)) { reply({ok:false,error:'不支持的请求'}); return false; }
  if (busyTabs.has(sender.tab.id)) { reply({ok:false,error:'上一次打开操作尚未完成，请先处理应用选择窗口。'}); return false; }
  let payload;
  try { payload = message.action === 'openFile' ? {action:'openFile',path:message.path,mode:message.mode}
    : {action:'openCopy',filename:core.fileName(message.filename),base64:message.base64,mode:message.mode}; }
  catch { reply({ok:false,error:'不支持的文件名称'}); return false; }
  busyTabs.add(sender.tab.id);
  chrome.runtime.sendNativeMessage(HOST, payload)
    .then(reply, () => reply({ok:false,error:'无法连接本地打开组件。请运行新版 Install-or-Update.cmd，并重新加载扩展。'}))
    .finally(() => busyTabs.delete(sender.tab.id));
  return true;
});
