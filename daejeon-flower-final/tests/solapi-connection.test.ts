import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSolapiConnection, solapiRequest} from '../lib/server/solapi';

test('connection check only reads balance and never exposes secrets or provider body', async () => {
  const original = globalThis.fetch;
  const env = {SOLAPI_API_KEY:'test-key',SOLAPI_API_SECRET:'test-secret'} as any;
  const calls: string[] = [];
  let status = 200;
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push(String(url));
    assert.equal(init.method, 'GET');
    assert.equal(init.body, undefined);
    return new Response('{"accountId":"private-account","balance":300}', {status});
  }) as typeof fetch;
  try {
    assert.deepEqual(await checkSolapiConnection(env), {ok:true,code:'CONNECTED'});
    status = 401;
    assert.deepEqual(await checkSolapiConnection(env), {ok:false,code:'HTTP_401'});
    const count = calls.length;
    assert.deepEqual(await checkSolapiConnection({...env,SOLAPI_API_SECRET:' secret\n'}), {ok:false,code:'CREDENTIAL_WHITESPACE'});
    assert.equal(calls.length, count);
    assert.ok(calls.every(url => url === 'https://api.solapi.com/cash/v1/balance'));
    await assert.rejects(solapiRequest(env, '/cash/v1/balance', {}), /INVALID_PROVIDER_PATH/);
    globalThis.fetch = (async () => {throw new Error('private-provider-error')}) as typeof fetch;
    assert.deepEqual(await checkSolapiConnection(env), {ok:false,code:'CONNECTION_EXCEPTION'});
    globalThis.fetch = (async () => {throw new DOMException('private-timeout', 'TimeoutError')}) as typeof fetch;
    assert.deepEqual(await checkSolapiConnection(env), {ok:false,code:'CONNECTION_TIMEOUT'});
  } finally { globalThis.fetch = original; }
});
