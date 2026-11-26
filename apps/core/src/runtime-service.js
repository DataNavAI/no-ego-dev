import {createCoreService as createDomainService} from './service.js';
import {createCoreRuntime} from './coordinator.js';

export async function createCoreService(options={}){
  const service=await createDomainService(options);
  try{
    const runtime=await createCoreRuntime({...options,store:service.store,maintenance:service.maintenance});
    const close=service.close.bind(service);
    service.runtime=runtime;
    service.capabilities=()=>({version:1,operatorOnly:true,dispatchAutomatic:false,owner:runtime.status(),capacity:service.store.capacity()});
    let closePromise;
    service.close=()=>closePromise??=(async()=>{await runtime.close();await close();})();
    return service;
  }catch(error){await service.close();throw error;}
}
