'use strict';
const toggle=document.getElementById('chinese'),status=document.getElementById('status'),probe=document.getElementById('probe');
chrome.storage.local.get({chinese:true}).then(value=>{toggle.checked=value.chinese!==false;});
toggle.addEventListener('change',()=>chrome.storage.local.set({chinese:toggle.checked}));
probe.addEventListener('click',async()=>{probe.disabled=true;status.textContent='正在检查…';try{const result=await chrome.runtime.sendMessage({action:'probe'});status.textContent=result?.ok?'本地组件可用（'+result.version+'）。导出目录：\n'+result.exportRoot+(result.version!=='1.1.0'?'\n请运行新版安装或更新脚本，以启用文件资源管理器入口。':''):result?.error||'尚未安装本地组件';}catch{status.textContent='本地组件连接失败。';}finally{probe.disabled=false;}});
