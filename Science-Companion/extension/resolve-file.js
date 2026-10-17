// Executed in the page world only after an extension button is clicked.
// Read the selected menu's file identity; never search the whole page for a filename.
async function resolveScienceFile(menuId) {
  async function artifact(id, version, uncertain=false) {
    if (uncertain || typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return {kind:'unknown'};
    try {
      // Use the page's existing local API session inside the page world.
      // Credentials never leave this function or go to the native component.
      const bootstrap=globalThis.__OPERON__ || {};
      const base=new URL(bootstrap.baseUrl || '/',location.origin);
      if(base.origin!==location.origin || base.username || base.password) return {kind:'unknown'};
      const endpoint=new URL(base.pathname.replace(/\/$/,'')+'/api/artifacts/'+encodeURIComponent(id)+'/metadata',location.origin);
      const headers=typeof bootstrap.token==='string'?{Authorization:'Bearer '+bootstrap.token}:{};
      const request=async url=>{
        const response=await fetch(url,{credentials:'same-origin',headers,redirect:'error',signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error('Science 文件信息读取失败（HTTP '+response.status+'）');
        return response.json();
      };
      const meta=await request(endpoint.href);
      let selected=meta;
      if(version && version!==meta.version_id) {
        const versions=await request(endpoint.href.replace(/\/metadata$/,'/versions'));
        const matches=Array.isArray(versions)?versions.filter(v=>v.version_id===version && v.artifact_id===id):[];
        if(matches.length!==1)return {kind:'unknown',reason:'未能确认当前版本的存储记录，未打开其他版本。'};
        selected=matches[0];
      }
      // file_path is resolved by Science's storage service. It also points to
      // internally stored artifacts when ref_host_path is null. Do not reconstruct
      // a path from IDs: content deduplication can place it under another artifact.
      const path=selected.file_path || (selected===meta?meta.ref_host_path:null);
      if(typeof path!=='string' || !path)return {kind:'artifact',reason:'当前版本的存储记录没有可用文件路径。'};
      const internal=!(selected===meta && meta.ref_host_path && meta.ref_host_path===path);
      return {kind:'local',path,storage:internal?'science':'original',version:selected.version_id};
    } catch(error) {return {kind:'unknown',reason:error.message || '读取文件存储记录失败。'};}
  }
  const menu = [...document.querySelectorAll('[data-scomp-menu]')].find(n => n.dataset.scompMenu === menuId);
  if (!menu) return {kind:'unknown'};
  const key = Object.keys(menu).find(k => k.startsWith('__reactFiber$'));
  let fiber = key && menu[key];
  if(fiber) {
    let root=fiber;while(root.return)root=root.return;
    if(root.stateNode?.current && root.stateNode.current!==root)fiber=fiber.alternate || null;
  }
  let menuPosition=null;
  for (let depth = 0; fiber && depth < 16; depth++, fiber = fiber.return) {
    const p = fiber.memoizedProps;
    if (!p || typeof p !== 'object') continue;
    if (p.selectedCount > 1) return {kind:'multiple'};
    if(typeof p.onClose==='function' && Number.isFinite(p.x) && Number.isFinite(p.y)) menuPosition={x:p.x,y:p.y};
    if(menuPosition) {
      // G5 portals menus from the library, conversation tray and markdown links.
      // Their selected data use three distinct shapes. Resolve this hook before
      // enclosing preview props: a document link may point to another artifact.
      const candidates=new Map();let hook=fiber.memoizedState;
      for(let count=0;hook && count<160;count++,hook=hook.next) {
        for(const candidate of [hook.memoizedState,hook.memoizedState?.current]) {
          if(candidate?.position?.x!==menuPosition.x || candidate?.position?.y!==menuPosition.y)continue;
          const item=candidate.data;
          if(!item || typeof item!=='object')continue;
          const identities=[
            [item.id,item.version_id],           // library
            [item.artifact_id,item.version_id],  // conversation generated-file tray
            [item.artifactId,item.versionId]     // inline links, code and bold references
          ].filter(([id])=>typeof id==='string');
          for(const [id,version] of identities) {
            if(version!=null && typeof version!=='string')return {kind:'unknown'};
            candidates.set(id+'|'+(version??''),{id,version});
          }
          // A data-bearing menu belongs to this target, never to a parent file.
          if(!identities.length)return {kind:'unknown'};
        }
      }
      if(candidates.size>1)return {kind:'unknown',reason:'当前菜单匹配到多个文件，未打开任何文件。'};
      if(candidates.size===1){const item=[...candidates.values()][0];return artifact(item.id,item.version);}
    }
    const ref = p.file?.ref;
    if (ref?.kind === 'local' && typeof ref.absPath === 'string') return {kind:'local',path:ref.absPath};
    if (ref?.kind === 'remote') return {kind:'remote',provider:String(ref.provider),path:String(ref.path)};
    if (ref?.kind === 'artifact') return artifact(ref.artifactId,ref.versionId);
    // Conversation image wrapper L4 carries the resolved identity in its props.
    if (typeof p.resolvedArtifactId==='string') return artifact(p.resolvedArtifactId,p.resolvedVersionId);
    if (p.tile?.artifactId) {
      // The viewer keeps its displayed version in state, separately from tile.versionId.
      // Read only matching preview props in this viewer subtree, never unrelated hooks.
      const versions = new Set(), stack = [];
      if (fiber.child) stack.push(fiber.child);
      for (let visits=0; stack.length && visits<600; visits++) {
        const node=stack.pop(), props=node.memoizedProps;
        const preview=props?.artifact?.id === p.tile.artifactId && typeof props.versionId === 'string';
        if(preview)versions.add(props.versionId);
        // Once identified, skip the document renderer, which can have thousands of nodes.
        if(node.child && !preview)stack.push(node.child);
        if(node.sibling)stack.push(node.sibling);
      }
      return artifact(p.tile.artifactId,versions.size===1?[...versions][0]:null,versions.size!==1 || stack.length>0);
    }
    // Artifact viewer props. Stop at its exact tab, not unrelated parent state.
    if (p.tab?.artifactId) return artifact(p.tab.artifactId,p.tab.versionId || null);
    if (p.artifact?.id && p.artifact?.version_id) return artifact(p.artifact.id,p.versionId || p.artifact.version_id);
  }
  return {kind:'unknown'};
}
