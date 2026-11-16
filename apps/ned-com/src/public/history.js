export function validateMessagePage(rows) {
  const invalid=()=>Object.assign(new Error('History changed.'),{code:'history_changed'});
  if(!Array.isArray(rows)||rows.length>50)throw invalid();
  const ids=rows.map(row=>{
    const id=row?.id;
    if(!row || Array.isArray(row) || !(Number.isSafeInteger(id)&&id>=0 || typeof id==='string'&&id.trim()&&id.length<=200))throw invalid();
    return String(id);
  });
  if(new Set(ids).size!==ids.length)throw invalid();
  return rows;
}
