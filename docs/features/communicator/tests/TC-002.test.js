import test from 'node:test';
import assert from 'node:assert/strict';
test('TC-002: unavailable inventory, identity, stale responses and recovery', async () => {
  const {initialState, beginLoad, settleLoad, selectProject, selectSection, view} = await import('../../../../src/communicator/public/state.js');
  let state = initialState(); assert.equal(view(state).title,'Loading projects…');
  state = settleLoad(state,state.requestGeneration,{capabilities:{projects:false},projects:[{id:'fake',name:'Fake'}]});
  assert.equal(view(state).title,'Projects'); assert.equal(state.projects.length,0); assert.equal(view(state).body,'Project browsing is not available yet.');
  state = beginLoad(state); assert.equal(beginLoad(state),state);
  state = settleLoad(state,state.requestGeneration,null,'inventory'); assert.equal(view(state).title,'Projects could not be loaded');
  state = beginLoad(state); assert.equal(view(state).retry,true); state = settleLoad(state,state.requestGeneration,{capabilities:{projects:true},projects:[]}); assert.equal(view(state).title,'No projects yet');
  state = beginLoad(state); state = settleLoad(state,state.requestGeneration,{capabilities:{projects:true},projects:[{id:'a',name:'Alpha'},{id:'b',name:'Beta <script>'}]});
  state = selectProject(state,'a'); const old = state.requestGeneration; state = selectSection(state,'Artifacts'); assert.equal(view(state).body,'Artifact browsing is not available yet.');
  state = selectProject(state,'b'); assert.equal(state.projectId,'b'); assert.equal(state.section,'Tasks'); assert.equal(view(state).projectName,'Beta <script>');
  assert.equal(settleLoad(state,old,{projects:[]}),state);
  state = selectSection(state,'WIP app'); assert.equal(view(state).body,'App previews are not available yet.');
  for (const [error,title] of [['folder','Project folder is unavailable.'],['database_unavailable','Project data could not be loaded.']]) {
    const pending = beginLoad(state); const failed = settleLoad(pending,pending.requestGeneration,null,error);
    assert.equal(view(failed).title,title); assert.equal(failed.projectId,'b');
    const recovery = beginLoad(failed); assert.equal(beginLoad(recovery),recovery);
    assert.equal(view(settleLoad(recovery,recovery.requestGeneration,null,'inventory')).title,'Projects could not be loaded');
  }
  state = selectProject(state,'unknown'); assert.equal(state.projectId,null); assert.equal(view(state).title,'Project is unavailable.');
});
