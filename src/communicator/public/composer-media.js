const mimeTypes={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',txt:'text/plain',md:'text/markdown',csv:'text/csv',json:'application/json',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export function insertLink(text,start,end,url,label=''){
  let parsed;try{parsed=new URL(url);}catch{throw new Error('Enter a valid HTTP or HTTPS URL.');}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Enter a valid HTTP or HTTPS URL without credentials.');
  const address=parsed.href.replaceAll('(','%28').replaceAll(')','%29');
  const title=(label.trim()||url).replace(/[\\[\]]/g,'\\$&').replace(/[\r\n]/g,' ');
  const link=`[${title}](${address})`;
  if(text.length-(end-start)+link.length>8000)throw new Error('Message exceeds 8000 characters.');
  return {text:text.slice(0,start)+link+text.slice(end),caret:start+link.length};
}
export function mountComposerMedia({document,draft,getSession,changed,request=fetch}){
  const element=id=>document.getElementById(id);
  const picker=element('chat-files');
  if(!picker)return {pending:()=>false,ready:()=>false,ids:()=>[],clear(){},render(){}};
  let files=[];let locked=true;let selection=[0,0];
  function render(disabled=locked){
    locked=disabled;
    for(const id of ['chat-attach','chat-add-link','chat-link-insert','chat-link-cancel','chat-link-url','chat-link-label'])element(id).disabled=disabled;
    picker.disabled=disabled;
    element('chat-attachments').replaceChildren(...files.map(file=>{
      const chip=document.createElement('li');const label=document.createElement('span');label.textContent=`${file.name} · ${file.id?'Ready':'Uploading…'}`;
      const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${file.name}`);remove.disabled=disabled;
      remove.addEventListener('click',()=>{files=files.filter(row=>row!==file);render();changed();});
      chip.append(label,remove);return chip;
    }));
  }
  const message=text=>{element('chat-attachment-status').textContent=text;};
  element('chat-attach').addEventListener('click',()=>picker.click());
  picker.addEventListener('change',async()=>{
    const chosen=Array.from(picker.files);picker.value='';message('');
    for(const file of chosen){
      if(locked)break;
      const extension=file.name.split('.').at(-1).toLowerCase();
      if(!mimeTypes[extension]){message('Unsupported file type. Choose PNG, JPEG, WebP, TXT, MD, CSV, JSON, PDF or DOCX.');continue;}
      if(!file.size||file.size>4194304){message('Files must be nonempty and at most 4 MB.');continue;}
      if(mimeTypes[extension].startsWith('image/')&&(file.size>2097152||files.filter(row=>row.image).reduce((sum,row)=>sum+row.size,0)+file.size>2097152)){message('All images in one message must total at most 2 MB.');continue;}
      if(files.length>=4||files.reduce((sum,row)=>sum+row.size,0)+file.size>16777216){message('Choose up to four files, at most 16 MB together.');continue;}
      const row={name:file.name,size:file.size,image:mimeTypes[extension].startsWith('image/')};files.push(row);render();changed();
      try{
        const response=await request(`/api/chat/sessions/${encodeURIComponent(getSession())}/attachments`,{method:'POST',headers:{'Content-Type':mimeTypes[extension],'X-NED-Filename':encodeURIComponent(file.name)},body:await file.arrayBuffer(),signal:AbortSignal.timeout(20000)});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error?.message ?? 'Attachment could not be uploaded. Try again.');
        if(typeof data.attachment?.id!=='string')throw new Error('Attachment could not be uploaded. Try again.');
        row.id=data.attachment.id;
      }catch(error){files=files.filter(file=>file!==row);message(error.message);}
      finally{render();changed();}
    }
  });
  element('chat-add-link').addEventListener('click',()=>{
    selection=[draft.selectionStart ?? draft.value.length,draft.selectionEnd ?? draft.value.length];
    element('chat-link-editor').hidden=false;element('chat-link-error').textContent='';element('chat-link-url').focus();
  });
  const close=()=>{element('chat-link-editor').hidden=true;draft.focus({preventScroll:true});};
  element('chat-link-cancel').addEventListener('click',close);
  element('chat-link-insert').addEventListener('click',()=>{
    try{
      const result=insertLink(draft.value,...selection,element('chat-link-url').value,element('chat-link-label').value);
      draft.value=result.text;changed();close();draft.setSelectionRange(result.caret,result.caret);element('chat-link-url').value='';element('chat-link-label').value='';
    }catch(error){element('chat-link-error').textContent=error.message;}
  });
  return {pending:()=>files.some(file=>!file.id),ready:()=>files.some(file=>file.id),ids:()=>files.map(file=>file.id),clear(){files=[];message('');render();},render};
}
