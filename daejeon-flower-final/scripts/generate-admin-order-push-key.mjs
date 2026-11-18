import { generateKeyPairSync } from 'node:crypto';
const { privateKey } = generateKeyPairSync('ec', {namedCurve:'prime256v1'});
console.log(JSON.stringify(privateKey.export({format:'jwk'})));
