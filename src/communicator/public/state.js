export const initialState = () => ({status:'loading',projects:[],projectId:null,section:'Tasks',requestGeneration:1,error:null,detail:null,detailLoading:false});
export const beginLoad = state => state.status === 'loading' ? state : {...state,status:'loading',detail:null,detailLoading:false,error:null,requestGeneration:state.requestGeneration+1,retrying:true};
export function settleLoad(state,generation,data,error = null) {
  if (generation !== state.requestGeneration) return state;
  if (error) return {...state,status:'error',error,retrying:false};
  const available = data?.capabilities?.projects === true;
  const projects = available && Array.isArray(data.projects) ? data.projects.filter(row => typeof row.id === 'string' && typeof row.name === 'string') : [];
  const projectId = projects.some(row => row.id === state.projectId) ? state.projectId : null;
  return {...state,status:available ? 'ready' : 'unavailable',projects,projectId,error:null,retrying:false};
}
export const selectProject = (state,id) => ({...state,status:'ready',projectId:state.projects.some(row => row.id === id) ? id : null,section:'Tasks',error:state.projects.some(row => row.id === id) ? null : 'project_unavailable',detail:null,detailLoading:state.projects.some(row=>row.id===id),requestGeneration:state.requestGeneration+1});
export const selectSection = (state,section) => state.projectId && ['Tasks','Artifacts','WIP app'].includes(section) ? {...state,section} : state;
export const beginDetail = state => state.detailLoading ? state : {...state,detail:null,detailLoading:true,error:null,requestGeneration:state.requestGeneration+1,retrying:true};
export function settleDetail(state,generation,data,error=null) {
  if(generation!==state.requestGeneration)return state;
  return {...state,detail:data,detailLoading:false,error,retrying:false};
}
export function view(state) {
  const row=state.projects.find(row => row.id === state.projectId);
  const identity={projectName:row?.name ?? '',displayPath:row?.displayPath ?? ''};
  if (state.status === 'loading') return {title:'Loading projects…',body:'',...identity,retry:Boolean(state.retrying)};
  if (state.detailLoading) return {title:'Loading project…',body:'',...identity,retry:Boolean(state.retrying)};
  if (state.error) {
    const errors = {project_unavailable:['Project is unavailable.','Choose another project or retry.'],folder:['Project folder is unavailable.','Check access to the project folder, then retry.'],project_folder_unavailable:['Project folder is unavailable.','Check access to the project folder, then retry.'],database_unavailable:['Project data could not be loaded.','Check that the NED database is available, then retry.']};
    const [title,body] = errors[state.error] ?? ['Projects could not be loaded','Check that NEDCOM is running, then retry.'];
    return {title,body,...identity,retry:true};
  }
  if(state.projectId && state.section==='WIP app' && state.detail) {
    const previews={available:['App is running','Open the project app in a new tab.'],unconfigured:['No app preview configured','Configure a local preview URL for this project, then retry.'],stopped:['App is not running','Start the project app separately, then retry.'],invalid:['App preview URL is not allowed','Use an allowed local preview URL for this project, then retry.'],unavailable:['Project data could not be loaded.','Check that the NED database is available, then retry.']};
    const preview=state.detail.preview;const [title,body]=previews[preview?.status] ?? previews.unavailable;
    return {title,body,...identity,retry:preview?.status!=='available',url:preview?.status==='available' ? preview.url : undefined};
  }
  if (state.projectId) return {title:state.section==='Tasks'?'Goals':state.section==='WIP app'?'Preview':state.section,body:{Tasks:'Task browsing is not available yet.',Artifacts:'Artifact browsing is not available yet.','WIP app':'App previews are not available yet.'}[state.section],...identity,retry:false};
  if (state.status === 'unavailable') return {title:'Projects',body:'Project browsing is not available yet.',...identity,retry:false};
  return {title:state.projects.length ? 'Projects' : 'No projects yet',body:state.projects.length ? 'Choose a project to browse its tasks, artifacts and app.' : 'Register a project with NED, then retry.',...identity,retry:!state.projects.length};
}
