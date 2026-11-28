import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-054: real chat-triggered task registration feeds the all-project Goals pane',async t=>{
  const f=await browserChat(t,{async onTurn({input,home}){
    const name=input.includes('inventory')?'inventory':'storefront';
    const project=join(home,name);
    await mkdir(project);
    function cli(...args){
      const result=spawnSync(process.execPath,['bin/ned.js',...args,'--project',project,'--actor','agent:fixture','--json'],
        {env:{PATH:process.env.PATH,HOME:home,NED_AGENT_HOME:home,NED_DATABASE_URL:join(home,'ned.sqlite')},encoding:'utf8',timeout:10000});
      assert.equal(result.status,0,result.stderr);
      return JSON.parse(result.stdout);
    }
    cli('task','init');
    const created=cli('goal','create',name+' launch');
    cli('task','create',name+' verification','--goal',created.id??created.item?.id);
    return 'Saved the work.';
  }});
  await f.ready();
  const goals=f.page.locator('#goals-panel');
  await expect(goals).toContainText('No goals or tasks yet.');
  for(const [index,name] of ['inventory','storefront'].entries()){
    await f.draft.fill('Plan the '+name);await f.draft.press('Enter');
    await expect.poll(()=>f.turns.length).toBe(index+1);
    f.turns.at(-1).finish();
    if(index===0){
      await expect(goals).toContainText('No task working now.');
      await expect(goals).not.toContainText(name+' verification');
      await goals.getByRole('checkbox',{name:'Show inactive tasks'}).check();
    }
    await expect(goals).toContainText(name+' launch');
    await expect(goals).toContainText(name+' verification');
  }
  await expect(goals).toContainText('inventory verification');
  await f.page.locator('#dashboard-tab').click();
  const dashboard=f.page.locator('#dashboard');
  await expect(dashboard).toContainText('0 / 2 tasks completed');
  await dashboard.getByRole('button',{name:/Reference task: inventory verification/}).click();
  await expect(f.page.locator('#chat-task-references')).toContainText('inventory verification');
  await expect(f.page.getByRole('combobox',{name:'Project'})).toHaveCount(0);
  await expect(f.page.locator('#chat-task-references')).toContainText('inventory');
});
