import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {browserChat,expect} from './browser-chat-fixture.js';

test('TC-044: desktop and mobile chat exceed ninety percent independently',{timeout:45000},async t=>{
  for(const [device,width,height,narrow] of [['desktop',1440,900,1024],['mobile',390,844,320]])await t.test(device,async t=>{
    const {page,draft,send,ready,setHistoryFailure,errors}=await browserChat(t,{viewport:{width,height}});
    const part=id=>page.locator('#'+id);
    const results=[];
    const check=(name,pass)=>results.push({name,pass:Boolean(pass)});
    const snap=async name=>{if(process.env.NED_UI_EVIDENCE_DIR)await page.screenshot({path:join(process.env.NED_UI_EVIDENCE_DIR,`${device}-${name}.png`)});};
    const metrics=()=>page.evaluate(()=>{
      const {document,innerWidth,innerHeight,getComputedStyle}=globalThis;
      const box=id=>document.getElementById(id).getBoundingClientRect().toJSON();
      const visible=id=>Boolean(document.getElementById(id)?.getClientRects().length);
      return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,chat:box('chat'),form:box('chat-form'),draft:box('chat-message'),send:box('chat-send'),attach:visible('chat-attach'),link:visible('chat-add-link'),provider:visible('model-setup-toggle'),font:parseFloat(getComputedStyle(document.getElementById('chat-message')).fontSize)};
    });
    await ready();
    const before=await metrics();
    check('chat has room',before.chat.width>=width*(device==='desktop'?.48:.98));
    check('ready empty state gives guidance',await part('chat-empty').isVisible());
    check('idle composer fits one row',before.form.height<=72&&Math.abs(before.send.y+before.send.height/2-before.draft.y-before.draft.height/2)<=8);
    check('context and model controls are grouped',await part('chat-tools-toggle').isVisible()&&!before.attach&&!before.link&&!before.provider);
    check('ready controls and text fit',!before.overflow&&before.send.width>=44&&before.send.height>=44&&before.font>=16&&before.send.bottom<=height);
    await snap('ready');
    await draft.focus();
    const focus=await part('chat-form').evaluate(node=>{
      const style=globalThis.getComputedStyle(node);
      return style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>=2;
    });
    check('keyboard focus is visible',focus);
    if(await part('chat-tools-toggle').isVisible()){
      const more=part('chat-tools-toggle');
      await more.focus();await more.press('Enter');
      const open=await more.getAttribute('aria-expanded')==='true'&&await part('chat-add-link').isVisible()&&await part('model-setup-toggle').isVisible();
      await snap('tools');await page.keyboard.press('Escape');
      check('tools open and dismiss by keyboard',open&&await more.getAttribute('aria-expanded')==='false'&&await more.evaluate(node=>node===globalThis.document.activeElement));
    }else check('tools open and dismiss by keyboard',false);
    await send('Suggest three items for a small picnic.');
    check('send streams, completes, and retires the empty cue',!(await part('chat-empty').isVisible())&&await page.locator('#transcript .message-content').count()===2);
    const text=await page.locator('#transcript .chat-message').last().evaluate(node=>{
      const style=globalThis.getComputedStyle(node);
      return {size:parseFloat(style.fontSize),leading:parseFloat(style.lineHeight),width:node.getBoundingClientRect().width};
    });
    check('reply has readable text and line length',text.size>=16&&text.leading>=text.size*1.4&&text.width<=720);
    await snap('reply');
    await draft.fill('Earlier draft');await draft.press('Shift+Enter');await draft.press('End');await draft.press('x');
    const multiline=await draft.inputValue(),grown=await metrics();
    check('multiline grows without submitting',multiline.includes('\n')&&grown.draft.height>before.draft.height&&await page.locator('#transcript .user-message').count()===1);
    await page.setViewportSize({width:narrow,height});
    const small=await metrics();
    check('narrow resize retains the draft and send',!small.overflow&&small.send.bottom<=height&&small.send.right<=narrow&&await draft.inputValue()===multiline);
    await snap('narrow');
    setHistoryFailure(true);
    await page.reload();await expect(part('chat-retry')).toBeVisible();
    const disabled=await part('chat-send').isDisabled();
    setHistoryFailure(false);await part('chat-retry').click();await ready();
    check('failed load has visible recovery',disabled&&await page.locator('#transcript .user-message').count()===1&&errors.length===0);
    const passed=results.filter(row=>row.pass).length;
    t.diagnostic(JSON.stringify({device,score:100*passed/results.length,results}));
    assert.ok(100*passed/results.length>90,results.filter(row=>!row.pass).map(row=>row.name).join('; '));
  });
});
