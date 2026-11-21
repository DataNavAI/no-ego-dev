import mammoth from 'mammoth';
import yauzl from 'yauzl';
import sharp from 'sharp';
const MAX_TEXT=131072;
const bounded=text=>{
  if(!text.trim()||Buffer.byteLength(text)>MAX_TEXT)throw new Error('Document text is empty or exceeds 128 KB.');
  return text;
};
async function inspectZip(buffer){
  await new Promise((resolve,reject)=>yauzl.fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(error,zip)=>{
    if(error)return reject(error);
    let count=0,total=0;const names=new Set();
    const fail=error=>{zip.close();reject(error);};
    zip.on('error',fail);zip.on('end',()=>names.has('word/document.xml')?resolve():reject(new Error('Not a DOCX document.')));
    zip.on('entry',entry=>{
      total+=entry.uncompressedSize;
      if(++count>256||total>8388608||entry.fileName.split('/').length>12||names.has(entry.fileName)||entry.generalPurposeBitFlag&1)return fail(new Error('Document archive exceeds limits.'));
      names.add(entry.fileName);
      if(entry.fileName.endsWith('/'))return zip.readEntry();
      zip.openReadStream(entry,(error,stream)=>{
        if(error)return fail(error);
        let bytes=0;const chunks=[];
        stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>8388608){stream.destroy();fail(new Error('Document archive exceeds limits.'));}else if(entry.fileName.endsWith('.xml')||entry.fileName.endsWith('.rels'))chunks.push(chunk);});
        stream.on('error',fail);
        stream.on('end',()=>{
          const xml=Buffer.concat(chunks).toString('utf8');
          if(/<!DOCTYPE|<!ENTITY|TargetMode\s*=\s*["']External["']/i.test(xml))return fail(new Error('External document resources are unsupported.'));
          zip.readEntry();
        });
      });
    });
    zip.readEntry();
  }));
}
process.once('message',async message=>{
  try{
    const buffer=Buffer.from(message.data,'base64');let text;
    if(message.type==='image'){
      await sharp(buffer,{limitInputPixels:16777216,failOn:'warning',pages:1}).raw().toBuffer();
      process.send({text:'validated'},()=>process.exit(0));return;
    }else if(message.type==='pdf'){
      const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
      const task=getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:false,enableXfa:false,useWorkerFetch:false,isOffscreenCanvasSupported:false,disableAutoFetch:true,disableStream:true,stopAtErrors:true});
      try{
        const document=await task.promise;
        if(document.numPages>100)throw new Error('PDF exceeds 100 pages.');
        text='';
        for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){
          const page=await document.getPage(pageNumber);const content=await page.getTextContent();
          text+=content.items.map(item=>typeof item.str==='string'?item.str:'').join(' ')+'\n';
          if(Buffer.byteLength(text)>MAX_TEXT)throw new Error('Document text exceeds 128 KB.');
          page.cleanup();
        }
      }finally{await task.destroy();}
    }else{
      await inspectZip(buffer);
      text=(await mammoth.extractRawText({buffer},{externalFileAccess:false})).value;
    }
    process.send({text:bounded(text)},()=>process.exit(0));
  }catch{process.send({error:'Document is unreadable, empty, protected or exceeds extraction limits.'},()=>process.exit(0));}
});
