import http from 'node:http';
export {apiFixture} from '../../ned-api/tests/helpers.js';
export async function appFixture(context,handler=(req,res)=>res.writeHead(404).end()){
  const server=http.createServer(handler);
  context.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,port:server.address().port};
}
export async function mutate(fixture,method,body){
  const response=await fixture.request('/api/v1/preview',{method,body,headers:{origin:fixture.app.url}});
  return {status:response.status,body:await response.json()};
}
export async function status(fixture){const r=await fixture.request('/api/v1/preview');return r.json();}
