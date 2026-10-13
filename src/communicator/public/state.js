export const initialState = () => ({status:'loading',projects:[],projectId:null,section:'Tasks',requestGeneration:1,error:null});
export const beginLoad = state => state.status === 'loading' ? state : {...state,status:'loading',error:null,requestGeneration:state.requestGeneration+1,retrying:true};
export function settleLoad(state,generation,data,error = null) {
  if (generation !== state.requestGeneration) return state;
  if (error) return {...state,status:'error',error,retrying:false};
  const available = data?.capabilities?.projects === true;
  const projects = available && Array.isArray(data.projects) ? data.projects.filter(row => typeof row.id === 'string' && typeof row.name === 'string') : [];
  const projectId = projects.some(row => row.id === state.projectId) ? state.projectId : null;
  return {...state,status:available ? 'ready' : 'unavailable',projects,projectId,error:null,retrying:false};
}
export const selectProject = (state,id) => ({...state,projectId:state.projects.some(row => row.id === id) ? id : null,section:'Tasks',error:state.projects.some(row => row.id === id) ? null : 'project_unavailable',requestGeneration:state.requestGeneration+1});
export const selectSection = (state,section) => state.projectId && ['Tasks','Artifacts','WIP app'].includes(section) ? {...state,section} : state;
export function view(state) {
  const projectName = state.projects.find(row => row.id === state.projectId)?.name ?? '';
  if (state.status === 'loading') return {title:'Loading projects…',body:'',projectName,retry:Boolean(state.retrying)};
  if (state.error) {
    const errors = {project_unavailable:['Project is unavailable.',''],folder:['Project folder is unavailable.','Check access to the project folder, then retry.'],database_unavailable:['Project data could not be loaded.','Check that the NED database is available, then retry.']};
    const [title,body] = errors[state.error] ?? ['Projects could not be loaded','Check that NEDCOM is running, then retry.'];
    return {title,body,projectName,retry:true};
  }
  if (state.projectId) return {title:state.section,body:{Tasks:'Task browsing is not available yet.',Artifacts:'Artifact browsing is not available yet.','WIP app':'App previews are not available yet.'}[state.section],projectName,retry:false};
  if (state.status === 'unavailable') return {title:'Projects',body:'Project browsing is not available yet.',projectName,retry:false};
  return {title:state.projects.length ? 'Projects' : 'No projects yet',body:state.projects.length ? 'Choose a project to browse its tasks, artifacts and app.' : 'Register a project with NED, then retry.',projectName,retry:!state.projects.length};
}
