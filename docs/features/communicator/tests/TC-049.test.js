import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {browserChat,expect} from './browser-chat-fixture.js';
import {pdfFixture,docxFixture} from './media-fixtures.js';

const file=(name,mimeType,buffer)=>({name,mimeType,buffer:Buffer.from(buffer)});
const note=file('notes.txt','text/plain','A synthetic customer note.');
const uploadRoute='**/api/v1/chat/sessions/nedcom-main/attachments';

test('TC-049: mixed attachments, attachment-only and text-only turns reach the gateway in order',async t=>{
  const fixture=await browserChat(t);
  const {page,draft,turns}=fixture;
  await fixture.ready();
  const picker=page.locator('#chat-files');
  const chips=page.locator('#chat-attachments');
  const send=page.locator('#chat-send');
  const png=await sharp({create:{width:4,height:3,channels:3,background:'red'}}).png().toBuffer();
  const image=file('sample.png','image/png',png);
  const pdf=file('report.pdf','application/pdf',pdfFixture());
  const docx=file('report.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',docxFixture());
  await page.getByRole('button',{name:'Message options'}).click();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Attach file',exact:true}).click();
  await (await chooser).setFiles([image,pdf,docx,note]);
  await expect(chips.locator('li span')).toHaveText(['sample.png · Ready','report.pdf · Ready','report.docx · Ready','notes.txt · Ready']);
  await chips.getByRole('button',{name:'Remove notes.txt'}).click();
  await draft.fill('Summarize these attachments.');
  await draft.press('Enter');
  await expect.poll(()=>turns.length).toBe(1);
  assert.deepEqual(turns[0].input,[
    {type:'text',text:'Summarize these attachments.'},
    {type:'image_url',image_url:{url:`data:image/png;base64,${png.toString('base64')}`}},
    {type:'text',text:'Attachment: report.pdf\nSynthetic PDF report\n'},
    {type:'text',text:'Attachment: report.docx\nSynthetic DOCX report\n\n'},
  ]);
  turns[0].partial();
  await expect(page.locator('[data-state="streaming"]')).toContainText('Visible partial 1');
  turns[0].finish();
  await expect(chips.locator('li')).toHaveCount(0);
  await expect(send).toHaveAttribute('aria-label','Send message');
  await page.reload();
  await fixture.ready();
  const user=page.locator('#transcript .user-message').first();
  await expect(user).toContainText('Image attachment');
  await expect(user).toContainText('Synthetic DOCX report');
  assert.doesNotMatch(await user.innerText(),/data:image/);

  await picker.setInputFiles(note);
  await expect(chips.locator('li span')).toHaveText('notes.txt · Ready');
  await expect(draft).toHaveValue('');
  await send.click();
  await expect.poll(()=>turns.length).toBe(2);
  assert.deepEqual(turns[1].input,[{type:'text',text:'Attachment: notes.txt\nA synthetic customer note.'}]);
  turns[1].finish();
  await expect(send).toHaveAttribute('aria-label','Send message');
  await fixture.send('One text-only follow-up.');
  assert.deepEqual(turns.map(turn=>typeof turn.input),['object','object','string']);
  assert.deepEqual(fixture.errors,[]);
});

test('TC-049: slow and rejected uploads preserve context through uncertain delivery on mobile',async t=>{
  const fixture=await browserChat(t,{viewport:{width:390,height:844}});
  const {page,draft,turns}=fixture;
  await fixture.ready();
  const chips=page.locator('#chat-attachments');
  const picker=page.locator('#chat-files');
  const attachmentStatus=page.locator('#chat-attachment-status');
  const status=page.locator('#chat-status');
  const send=page.locator('#chat-send');
  let release;
  const hold=new Promise(resolve=>{release=resolve;});
  try{
    await page.route(uploadRoute,async route=>{await hold;await route.continue();},{times:1});
    await draft.fill('Keep this draft.');
    await picker.setInputFiles(note);
    await expect(chips).toContainText('Uploading…');
    await expect(send).toBeDisabled();
    await draft.press('Enter');
    assert.equal(turns.length,0);
  }finally{release();}
  await expect(chips).toContainText('notes.txt · Ready');
  await page.route(uploadRoute,route=>route.fulfill({status:502,contentType:'text/plain',body:'Synthetic upstream error'}),{times:1});
  await picker.setInputFiles(file('offline.txt','text/plain','Synthetic file for transport failure.'));
  await expect(attachmentStatus).toHaveText('Attachment could not be uploaded. Try again.');
  await expect(chips.locator('li')).toHaveCount(1);
  await picker.setInputFiles(file('bad.json','application/json','invalid JSON'));
  await expect(attachmentStatus).toHaveText('JSON document is invalid.');
  await expect(chips.locator('li')).toHaveCount(1);
  await expect(draft).toHaveValue('Keep this draft.');
  await send.click();
  await expect.poll(()=>turns.length).toBe(1);
  turns[0].interrupt();
  await expect(status).toContainText('Delivery could not be confirmed');
  await expect(send).toBeDisabled();
  await expect(draft).toHaveValue('Keep this draft.');
  await expect(chips).toContainText('notes.txt · Ready');

  await page.getByRole('button',{name:'Reload',exact:true}).click();
  await fixture.ready();
  assert.equal(fixture.network.filter(path=>path.endsWith('/chat')).length,1);
  await send.click();
  await expect(status).toContainText('Remove it and attach it again.');
  assert.equal(turns.length,1);
  await expect(draft).toHaveValue('Keep this draft.');
  await chips.getByRole('button',{name:'Remove notes.txt'}).click();
  await picker.setInputFiles(note);
  await expect(chips).toContainText('notes.txt · Ready');
  await send.click();
  await expect.poll(()=>turns.length).toBe(2);
  assert.deepEqual(turns[1].input,turns[0].input);
  turns[1].finish();
  await expect(chips.locator('li')).toHaveCount(0);
  await expect(send).toHaveAttribute('aria-label','Send message');
  assert.deepEqual(fixture.errors,[]);
});
