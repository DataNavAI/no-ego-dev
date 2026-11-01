export function chatActivity(kind,tool){
  if(kind==='assistant.delta')return 'writing';
  if(kind==='run.started'||kind==='tool.completed'||kind==='tool.failed')return 'working';
  if(kind!=='tool.started'&&kind!=='tool.progress')return undefined;
  if(kind==='tool.progress'&&tool==='_thinking')return 'thinking';
  if(['web_search','web_extract','browser'].includes(tool))return 'searching';
  if(['read_file','read','search_files','grep','glob'].includes(tool))return 'reading';
  if(['terminal','execute_code','run_command'].includes(tool))return 'running';
  return 'working';
}
