import path from 'node:path';
import {createTaskService} from '../../../src/tasks.js';
import {fail,decode} from './store.js';
import {readDelivery,validateDelivery} from './delivery.js';

const reads=new Set(['getItems','getItem','getChildren','getDependencies','getReadyTasks','getTree','getGoalProgress','getStatus','getActivity','getDelivery','getTaskAttempts']);
const arity={initialize:[0,0],createItem:[2,2],getItems:[0,0],getItem:[1,1],getChildren:[1,1],getDependencies:[1,1],getReadyTasks:[0,0],getTree:[0,0],getGoalProgress:[1,1],getStatus:[0,0],getActivity:[1,1],startTask:[1,1],completeTask:[1,2],blockTask:[2,2],unblockTask:[1,1],getDelivery:[1,1],setDelivery:[2,2],getTaskAttempts:[1,2]};
const object=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));

export function createTaskCommand({store,mutate,saveDelivery}){
  return async function taskCommand(input,key){
    const {project,actor,operation,args}=input;
    const bounds=Object.hasOwn(arity,operation)?arity[operation]:null;
    if(typeof project!=='string'||!path.isAbsolute(project)||typeof actor!=='string'||!bounds||!Array.isArray(args)||args.length<bounds[0]||args.length>bounds[1])fail('invalid_task_command',400);
    if(operation==='createItem'){
      if(typeof args[0]!=='string'||!object(args[1],['title','parentId','description','priority','discoveredFrom']))fail('invalid_task_command',400);
    }else if(args.length&&typeof args[0]!=='string')fail('invalid_task_command',400);
    if(operation==='blockTask'&&!object(args[1],['on','reason','service']))fail('invalid_task_command',400);
    if(operation==='completeTask'&&args.length===2&&typeof args[1]!=='string')fail('invalid_task_command',400);
    if(operation==='getTaskAttempts'&&args.length===2&&typeof args[1]!=='string')fail('invalid_task_command',400);
    const task=await createTaskService({project,actor,database:store.db});
    const projectId=task.project.id;
    let delivery;
    if(operation==='setDelivery')delivery=await validateDelivery(args[1]);
    const execute=()=>{
      if(operation==='setDelivery'){task.sync.getItem(args[0]);return saveDelivery(projectId,args[0],delivery);}
      if(operation==='getDelivery'){task.sync.getItem(args[0]);return readDelivery(store.sql,projectId,args[0]);}
      if(operation==='getTaskAttempts'){
        task.sync.getItem(args[0]);
        let offset=0;
        if(args[1])try{const cursor=JSON.parse(Buffer.from(args[1],'base64url').toString());if(cursor.v!==1||cursor.projectId!==projectId||cursor.taskId!==args[0]||!Number.isSafeInteger(cursor.offset)||cursor.offset<0)throw new Error();offset=cursor.offset;}catch{fail('invalid_cursor',400);}
        const rows=store.sql.prepare('SELECT id,number,state,role,session_id,run_id,error_code,created_at,updated_at FROM ned_core_attempts WHERE project_id=? AND task_id=? ORDER BY number DESC,id LIMIT 21 OFFSET ?').all(projectId,args[0],offset).map(decode);
        return {data:rows.slice(0,20),nextCursor:rows.length>20?Buffer.from(JSON.stringify({v:1,projectId,taskId:args[0],offset:offset+20})).toString('base64url'):null};
      }
      return task.sync[operation](...args);
    };
    return reads.has(operation)?execute():mutate(`task-management/${projectId}/${actor}`,key,{operation,args},execute);
  };
}
