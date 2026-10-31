import {createSecretStore,SecretError,validateSecretKey} from './secrets.js';
export const secretUsage='Usage: ned secret <list [--json]|set KEY --stdin [--json]|get KEY [--file [--json]]|delete KEY [--json]>';
export async function runSecretCli(argv,io=console,dependencies={}){
  try{
    const [action,...args]=argv;
    if(action==='share'){
      if(args[0]!=='--path'||!args[1]||args.length>3||args.length===3&&args[2]!=='--json')throw new SecretError('invalid_command','Usage: ned secret share --path <private-export-path> [--json]');
      const result=(dependencies.secretStoreFactory||createSecretStore)({home:dependencies.home}).share(args[1]);io.log(JSON.stringify(result));return 0;
    }
    if(action==='--help'&&args.length===0){io.log(secretUsage);return 0;}
    const flags=args.filter(item=>item.startsWith('--')),names=args.filter(item=>!item.startsWith('--'));
    if(new Set(flags).size!==flags.length||flags.some(flag=>!['--json','--stdin','--file'].includes(flag)))throw new SecretError('invalid_command',secretUsage);
    const json=flags.includes('--json'),file=flags.includes('--file'),stdin=flags.includes('--stdin');
    if(!['list','set','get','delete'].includes(action)||names.length!==(action==='list'?0:1)||stdin!==(action==='set')||file&&action!=='get'||json&&action==='get'&&!file)throw new SecretError('invalid_command',secretUsage);
    if(names.length)validateSecretKey(names[0]);
    let value;
    if(stdin){
      const input=dependencies.stdin||process.stdin;
      if(input.isTTY)throw new SecretError('invalid_command','Enter secrets in COM Settings or pipe a private input file to --stdin.');
      let size=0;const chunks=[];
      for await(const chunk of input){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>65536)throw new SecretError('invalid_value','Secret exceeds 65536 bytes.');chunks.push(bytes);}
      try{value=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}catch{throw new SecretError('invalid_value','Secret must be UTF-8 text.');}
    }
    const store=(dependencies.secretStoreFactory||createSecretStore)({home:dependencies.home});
    const result=action==='list'?store.list():action==='set'?store.set(names[0],value):action==='get'?store.get(names[0],{file}):store.delete(names[0]);
    if(action==='get'&&!file)(dependencies.stdout||process.stdout).write(result);
    else io.log(json?JSON.stringify(result):action==='get'?result.path:action==='list'?result.map(item=>item.key).join('\n')||'No secrets saved.':action==='set'?'Secret saved.':'Secret deleted.');
    return 0;
  }catch(error){const known=error instanceof SecretError;io.error(JSON.stringify({error:known?error.code:'vault_unavailable',message:known?error.message:'Secrets are unavailable.'}));return known&&['invalid_command','invalid_key','invalid_value','invalid_path','not_found'].includes(error.code)?2:1;}
}
