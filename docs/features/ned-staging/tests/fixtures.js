import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {createStagingController,stagingInternals} from '../../../../src/staging/controller.js';
const {atomicJson,hash,safeTree}=stagingInternals;
export const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
export async function fixture(t,overrides={},givenRoot){
  const root=givenRoot||await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ned-stage-case-')));t.after(()=>fs.rm(root,{recursive:true,force:true}));const options={root,node:process.execPath,hermesSource:'/synthetic/hermes',requiredJobs:['test (20)','test (22)'],port:4215};
  const profile=path.join(root,'hermes/profiles/ned-staging'),db=path.join(root,'data/ned.sqlite');let main=A,failed=false,boundary;
  const safe={model:{provider:'openrouter'},terminal:{backend:'local',cwd:path.join(root,'projects'),auto_source_bashrc:false,shell_init_files:[]},fallback_providers:[],auxiliary:{summary:{provider:'auto'}},skills:{external_dirs:[]}};
  const native=async(action,data={})=>{
    if(action==='install'){await fs.mkdir(profile,{recursive:true});await fs.cp(data.source,profile,{recursive:true});await atomicJson(path.join(profile,'metadata.json'),{source:data.source});}
    if(action==='retarget'){await atomicJson(path.join(profile,'metadata.json'),{source:data.source});}
    if(action==='update'){const m=JSON.parse(await fs.readFile(path.join(profile,'metadata.json')));for(const name of ['SOUL.md','AGENTS.md'])await fs.copyFile(path.join(m.source,name),path.join(profile,name));await fs.rm(path.join(profile,'skills'),{recursive:true,force:true});await fs.cp(path.join(m.source,'skills'),path.join(profile,'skills'),{recursive:true});if(failed)throw new Error('Synthetic native update failure.');}
    if(action==='isolate')await atomicJson(path.join(profile,'config.yaml'),safe);
    if(action==='config')return JSON.parse(await fs.readFile(path.join(profile,'config.yaml')));
    if(action==='metadata')return JSON.parse(await fs.readFile(path.join(profile,'metadata.json')));
    if(action==='probe'){return {soul_loaded:(await fs.readFile(path.join(profile,'SOUL.md'),'utf8')).startsWith('soul '),agents_loaded:(await fs.readFile(path.join(profile,'AGENTS.md'),'utf8')).startsWith('agents '),skills_loaded:await fs.readFile(path.join(profile,'skills/project-manager/SKILL.md'),'utf8')==='skill '+(await fs.readFile(path.join(profile,'SOUL.md'),'utf8')).slice(5)};}
    return {};
  };
  const prepare=async sha=>{const release=path.join(root,'releases',sha),source=path.join(release,'profile-source');await fs.mkdir(path.join(source,'skills/project-manager'),{recursive:true});await atomicJson(path.join(release,'build-owner.json'),{sha,kind:'ned-staging-build'});await fs.writeFile(path.join(source,'SOUL.md'),'soul '+sha);await fs.writeFile(path.join(source,'AGENTS.md'),'agents '+sha);await fs.writeFile(path.join(source,'skills/project-manager/SKILL.md'),'skill '+sha);await fs.mkdir(path.join(release,'cli-app'),{recursive:true});await fs.writeFile(path.join(release,'cli-app/cli.js'),sha);const cli_files=await safeTree(path.join(release,'cli-app'));await atomicJson(path.join(release,'release.json'),{sha,profile_source_digest:hash(JSON.stringify(await safeTree(source))),cli_digest:hash(JSON.stringify(cli_files)),cli_files});};
  const dependencies={native,prepare,main:async()=>({sha:main,event:'push',branch:'main',jobs:options.requiredJobs.map(name=>({name,conclusion:'success'}))}),initialize:async()=>{const c=new Database(db);c.exec('CREATE TABLE tasks(title TEXT);INSERT INTO tasks VALUES(\'Stage task\')');c.close();},smoke:async()=>{const c=new Database(db,{readonly:true});try{if(c.prepare('SELECT title FROM tasks').get().title!=='Stage task')throw new Error('Lost task');}finally{c.close();}},boundary:async phase=>{if(boundary)await boundary(phase);},...overrides};
  const controller=createStagingController(options,dependencies);
  return {root,profile,db,options,dependencies,controller,native,prepare,setMain:value=>main=value,setFailed:value=>failed=value,setBoundary:value=>boundary=value,read:async p=>JSON.parse(await fs.readFile(path.join(root,p))),task:()=>{const c=new Database(db,{readonly:true});try{return c.prepare('SELECT title FROM tasks').get().title;}finally{c.close();}}};
}
