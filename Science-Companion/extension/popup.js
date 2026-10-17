'use strict';
const toggle=document.getElementById('chinese'),status=document.getElementById('status'),probe=document.getElementById('probe');
chrome.storage.local.get({chinese:true}).then(value=>{toggle.checked=value.chinese!==false;});
toggle.addEventListener('change',()=>chrome.storage.local.set({chinese:toggle.checked}));
probe.addEventListener('click',async()=>{probe.disabled=true;status.textContent='正在检查…';try{const result=await chrome.runtime.sendMessage({action:'probe'});status.textContent=result?.ok?'本地组件可用（'+result.version+'）。'+(result.version!=='1.2.1'?'请运行新版 Install-or-Update.cmd 更新本地组件。':'支持原文件打开与定位。缓存目录：\n'+result.cacheRoot):result?.error||'尚未安装本地组件';}catch{status.textContent='本地组件连接失败。';}finally{probe.disabled=false;}});
