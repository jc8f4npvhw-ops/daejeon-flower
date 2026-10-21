import test from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {build} from 'esbuild';

test('SOLAPI GET and POST requests construct successfully in the Workers runtime without external sends', async () => {
  const output = await build({stdin:{contents:`
    import {solapiRequest} from './lib/server/solapi';
    export default {async fetch(){
      const nativeFetch=globalThis.fetch;
      const seen=[];
      globalThis.fetch=async (url,init)=>{
        const request=new Request(url,init);
        seen.push({method:request.method,redirect:request.redirect});
        return new Response(null,{status:204});
      };
      try {
        const env={SOLAPI_API_KEY:'test-key',SOLAPI_API_SECRET:'test-secret'};
        await solapiRequest(env,'/cash/v1/balance');
        await solapiRequest(env,'/messages/v4/send-many/detail',{messages:[]});
        return Response.json(seen);
      } finally {globalThis.fetch=nativeFetch}
    }};
  `,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
  const mf=new Miniflare(convertV4MiniflareOptions({modules:true,compatibilityDate:'2026-10-17',script:output.outputFiles[0].text}));
  try {
    const response=await mf.dispatchFetch('https://local.test');
    assert.deepEqual(await response.json(),[{method:'GET',redirect:'manual'},{method:'POST',redirect:'manual'}]);
  } finally {await mf.dispose()}
});
