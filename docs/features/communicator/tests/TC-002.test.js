import test from 'node:test';
import assert from 'node:assert/strict';
test('TC-002: unavailable inventory, identity, stale responses and recovery', async () => {
  const {initialState, beginLoad, settleLoad, selectProject, selectSection, settleDetail, view} = await import('../../../../src/communicator/public/state.js');
  let state = initialState(); assert.equal(view(state).title,'Loading projects…');
  state = settleLoad(state,state.requestGeneration,{capabilities:{projects:false},projects:[{id:'fake',name:'Fake'}]});
  assert.equal(view(state).title,'Projects'); assert.equal(state.projects.length,0); assert.equal(view(state).body,'Project browsing is not available yet.');
  state = beginLoad(state); assert.equal(beginLoad(state),state);
  state = settleLoad(state,state.requestGeneration,null,'inventory'); assert.equal(view(state).title,'Projects could not be loaded');
  state = beginLoad(state); assert.equal(view(state).retry,true); state = settleLoad(state,state.requestGeneration,{capabilities:{projects:true},projects:[]}); assert.equal(view(state).title,'No projects yet');
  state = beginLoad(state); state = settleLoad(state,state.requestGeneration,{capabilities:{projects:true},projects:[{id:'a',name:'Alpha'},{id:'b',name:'Beta <script>'}]});
  state = selectProject(state,'a'); state=settleDetail(state,state.requestGeneration,null); const old = state.requestGeneration; state = selectSection(state,'Artifacts'); assert.equal(view(state).body,'Artifact browsing is not available yet.');
  state = selectProject(state,'b'); assert.equal(state.projectId,'b'); assert.equal(state.section,'Tasks'); assert.equal(view(state).projectName,'Beta <script>');
  assert.equal(settleLoad(state,old,{projects:[]}),state);
  state=settleDetail(state,state.requestGeneration,null); state = selectSection(state,'WIP app'); assert.equal(view(state).body,'App previews are not available yet.');
  for (const [error,title] of [['folder','Project folder is unavailable.'],['database_unavailable','Project data could not be loaded.']]) {
    const pending = beginLoad(state); const failed = settleLoad(pending,pending.requestGeneration,null,error);
    assert.equal(view(failed).title,title); assert.equal(failed.projectId,'b');
    const recovery = beginLoad(failed); assert.equal(beginLoad(recovery),recovery);
    assert.equal(view(settleLoad(recovery,recovery.requestGeneration,null,'inventory')).title,'Projects could not be loaded');
  }
  state = selectProject(state,'unknown'); assert.equal(state.projectId,null); assert.equal(view(state).title,'Project is unavailable.');
});

test('TC-002: Retry settlement restores keyboard focus without overriding navigation', async t => {
  const { clientHarness } = await import('./client-harness.js');
  for (const outcome of ['unconfigured','error','available','other-control','project-switch','section-switch','section-switch-blur']) {
    await t.test(outcome, async () => {
      const { elements, document, requests, respond } = await clientHarness();
      const retry = elements.get('retry'), project = elements.get('project');
      retry.focus(); retry.dispatch('click');
      assert.equal(retry.disabled, true);
      assert.equal(document.activeElement, document.body, 'disabled native button releases focus');
      retry.dispatch('click'); assert.equal(requests.length, 1, 'single-flight even for duplicate event');
      if (outcome === 'other-control') project.focus();
      if (outcome === 'project-switch') { project.focus(); project.value = 'b'; project.dispatch('change'); }
      if (outcome.startsWith('section-switch')) { elements.get('Tasks').focus(); elements.get('Tasks').dispatch('click'); if (outcome === 'section-switch-blur') document.activeElement = document.body; }
      await respond(outcome === 'error' ? { error: { code: 'database_unavailable' } } : { preview: { status: outcome === 'available' ? 'available' : 'unconfigured', url: 'http://127.0.0.1:8000/' } }, outcome === 'error' ? 503 : 200);
      if (outcome === 'project-switch') await respond({ preview: { status: 'unconfigured' } });
      const expected = ['other-control','project-switch'].includes(outcome) ? project : outcome === 'section-switch-blur' ? document.body : outcome === 'section-switch' ? elements.get('Tasks') : outcome === 'available' ? elements.get('heading') : retry;
      assert.equal(document.activeElement, expected, 'settlement preserves the keyboard destination');
      if (['unconfigured','error'].includes(outcome)) { assert.equal(retry.hidden, false); assert.equal(retry.disabled, false); }
      if (outcome === 'available') assert.equal(retry.hidden, true);
      assert.equal(requests.length, 0);
    });
  }
});
