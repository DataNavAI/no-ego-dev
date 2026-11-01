import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const destination=path.join(root,'src/communicator/public/vendor');
const check=process.argv.includes('--check');
const output=await build({
  absWorkingDir:root,
  entryPoints:{'webawesome':'src/communicator/public/controls-entry.js','webawesome-theme':'src/communicator/ui-controls.css'},
  outdir:destination,bundle:true,minify:true,format:'esm',target:'es2022',write:false,
  legalComments:'eof',charset:'utf8',logLevel:'warning',
});
const files=new Map(output.outputFiles.map(file=>[file.path,file.contents]));
files.set(path.join(destination,'webawesome-LICENSE.txt'),await readFile(path.join(root,'node_modules/@awesome.me/webawesome/LICENSE.md')));
files.set(path.join(destination,'wa-check.svg'),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n'));
files.set(path.join(destination,'wa-chevron.svg'),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>\n'));
await mkdir(destination,{recursive:true});
for(const [filename,bytes] of files){
  if(check){
    let current;try{current=await readFile(filename);}catch{throw new Error(`Missing generated UI asset: ${path.basename(filename)}. Run npm run build:ui.`);}
    if(!current.equals(Buffer.from(bytes)))throw new Error(`Stale generated UI asset: ${path.basename(filename)}. Run npm run build:ui.`);
  }else await writeFile(filename,bytes);
}
console.log(check?'Communicator UI assets match pinned sources.':'Built local Communicator UI assets.');
