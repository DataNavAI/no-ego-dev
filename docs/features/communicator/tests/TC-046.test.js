import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

const luminance=rgb=>rgb.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
function contrast(a,b){
  const [low,high]=[luminance(a),luminance(b)].sort((x,y)=>x-y);
  return (high+.05)/(low+.05);
}
test('TC-046: chat roles and primary action use a distinct, readable palette',{timeout:45000},async t=>{
  for(const [device,width,height] of [['desktop',1440,900],['mobile',320,740]])await t.test(device,async t=>{
    const {page,draft,ready,send}=await browserChat(t,{viewport:{width,height}});
    const style=selector=>page.locator(selector).evaluate(node=>{
      const css=globalThis.getComputedStyle(node);
      const rgb=cssColor=>cssColor.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number);
      return {fg:rgb(css.color),bg:rgb(css.backgroundColor),outline:rgb(css.outlineColor)};
    });
    await ready();
    const canvas=await style('#chat'),workspace=await style('#preview'),disabled=await style('#chat-send');
    assert.deepEqual(canvas.bg,[248,249,251]);
    assert.deepEqual(workspace.bg,[244,244,244]);
    await send('Suggest three items for a small picnic.');
    const user=await style('.user-message'),reply=await style('.assistant-message'),composer=await style('#chat-form');
    assert.deepEqual(user.bg,[204,228,250]);
    assert.deepEqual(reply.bg,[233,237,242]);
    const aligned=await page.locator('.assistant-message').evaluate(node=>{
      const transcript=node.parentElement;
      const left=transcript.getBoundingClientRect().left+parseFloat(globalThis.getComputedStyle(transcript).paddingLeft);
      return Math.abs(node.getBoundingClientRect().left-left)<2;
    });
    assert.ok(aligned,'a short assistant reply starts at the same edge as the transcript');
    assert.deepEqual(composer.bg,[255,255,255]);
    for(const pair of [user,reply,composer])assert.ok(contrast(pair.fg,pair.bg)>=4.5);
    await expect(page.locator('.user-message > strong')).toHaveText('You');
    await expect(page.locator('.assistant-message > strong')).toHaveText('NED');
    assert.ok(contrast((await style('.user-message > strong')).fg,user.bg)>=4.5);
    assert.ok(contrast((await style('.assistant-message > strong')).fg,reply.bg)>=4.5);
    await draft.fill('Turn that into a checklist.');
    const active=await style('#chat-send');
    assert.deepEqual(active.bg,user.bg);
    assert.notDeepEqual(active.bg,disabled.bg);
    assert.ok(contrast(active.fg,active.bg)>=3);
    assert.ok(contrast((await style('#chat-form')).outline,canvas.bg)>=3);
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth),true);
    if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,device+'-palette.png')});
  });
});
