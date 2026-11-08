/** Local, reproducible localization of the acquired Crazy Grand Prix client. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const root=process.cwd();
const input=path.resolve(process.argv.find(x=>x.startsWith('--source='))?.slice(9)||'../../StatOz Designer/downloads/crazy-grand-prix');
const target=path.join(root,'public/games/f1-racing/native');
const dataChunkBytes=64*1024*1024;
const digest=b=>createHash('sha256').update(b).digest('hex');
const expected={'game.wasm':'8380d1bc31a4b614ccce006d705653a9485b15160e57ce7373c6fc1c563f0bba','game.data':'224b7cafb5f19bee9ac8b7235c9d6f411920d9c86c9ef43cb0e8800e043c0896','game.framework.js':'20bcb62eeb419d740f4c4eaf3416250bedae9a4f989306526538da94d634c9ba','game.loader.js':'75083a3271c601c2933e0b94cb8b59c17f7ff8fed2c923868dfd978e82bde964'};
const originals={};for(const[name,hash]of Object.entries(expected)){const b=await fs.readFile(path.join(input,name));if(digest(b)!==hash)throw Error('Unexpected original: '+name);originals[name]=b;}
function leb(b,p){let n=0,s=0,v;do{v=b[p++];n+=(v&127)*2**s;s+=7;}while(v&128);return[n,p];}
function enc(n){const out=[];do{let x=n&127;n=Math.floor(n/128);if(n)x|=128;out.push(x);}while(n);return Buffer.from(out);}
// Metadata-token0x06000b53 -> Assembly-CSharp slot2898 -> table26753 -> function34010.
// Local platform policy replaces IsOnValidHost with true. Actual location/origin stays unchanged.
// All native car/scene/mode/physics code and all data remain original.
const source=originals['game.wasm'];const chunks=[source.subarray(0,8)];let p=8,patch;
while(p<source.length){const sectionStart=p,id=source[p++];let size;[size,p]=leb(source,p);const end=p+size;
 if(id!==10){chunks.push(source.subarray(sectionStart,end));p=end;continue;}
 let count;[count,p]=leb(source,p);const bodies=[enc(count)];
 // This exact build declares495 imported functions (verified by the acquisition WAT index).
 for(let i=0;i<count;i++){let len;[len,p]=leb(source,p);const body=source.subarray(p,p+len);p+=len;
  if(i+495===34010){const replacement=Buffer.from([0,0x41,1,0x0b]);patch={functionIndex:34010,oldBodySha256:digest(body),oldBodyBytes:len,newBodyHex:replacement.toString('hex'),reason:'Explicit offline local-host platform policy; no host or URL spoofing'};bodies.push(enc(replacement.length),replacement);}else bodies.push(enc(len),body);
 }
 const code=Buffer.concat(bodies);chunks.push(Buffer.from([id]),enc(code.length),code);p=end;
}
if(!patch)throw Error('Native local-platform function not found');
const wasm=Buffer.concat(chunks);if(!WebAssembly.validate(wasm))throw Error('Localized WASM is invalid');
function replaceFunction(source,name,replacement){const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing function '+name);let p=source.indexOf('{',start)+1,depth=1,quote='',escape=false;for(;p<source.length&&depth;p++){const c=source[p];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';}else if(c==='"'||c==="'"||c==='`')quote=c;else if(c==='{')depth++;else if(c==='}')depth--;}
 if(depth)throw Error('Unbalanced function '+name);return source.slice(0,start)+replacement+source.slice(p);
}
let framework=originals['game.framework.js'].toString();
framework=replaceFunction(framework,'_InitSDK','function _InitSDK(version,objectName){return window.F1LocalPlatform.init(UTF8ToString(version),UTF8ToString(objectName),SendMessage,UTF8ToString)}');
await fs.mkdir(target,{recursive:true});
const outputs={'game.wasm.gz':gzipSync(wasm,{level:9}),'game.framework.js':Buffer.from(framework),'game.loader.js':originals['game.loader.js']};
const dataGzip=gzipSync(originals['game.data'],{level:9}),dataParts=[];
for(let offset=0,index=0;offset<dataGzip.length;offset+=dataChunkBytes,index++){
 const bytes=dataGzip.subarray(offset,Math.min(offset+dataChunkBytes,dataGzip.length));
 const file=`game.data.part-${String(index+1).padStart(3,'0')}.gz`;
 outputs[file]=bytes;dataParts.push({file,sha256:digest(bytes),bytes:bytes.length});
}
// GitHub rejects individual Git blobs above 100 MiB. The boot loader joins
// these byte-exact gzip slices before streaming decompression into Unity.
const dataPartsDocument=Buffer.from(JSON.stringify({schemaVersion:1,content:'game.data.gz',sha256:digest(dataGzip),bytes:dataGzip.length,parts:dataParts},null,2)+'\n');
outputs['data-parts.json']=dataPartsDocument;
await fs.unlink(path.join(target,'game.data.gz')).catch(error=>{if(error.code!=='ENOENT')throw error});
for(const[name,b]of Object.entries(outputs))await fs.writeFile(path.join(target,name),b);
await fs.writeFile(path.join(target,'localization-manifest.json'),JSON.stringify({game:'Crazy Grand Prix',buildId:'6c65ae46-cd7f-4feb-be39-441821588cdf',runtime:'original Unity2022.3.11f1 native client with explicit local-platform adaptation',source:'https://www.crazygames.com/game/crazy-grand-prix',originals:Object.entries(expected).map(([file,sha256])=>({file,sha256,bytes:originals[file].length})),changes:[patch,{file:'game.framework.js',function:'_InitSDK',reason:'Authored offline SDK init; never loads remote SDK or fabricates ad/purchase/user rewards'}],localizedWasmSha256:digest(wasm),files:Object.entries(outputs).map(([file,b])=>({file,sha256:digest(b),bytes:b.length})),dataParts:{content:'game.data.gz',sha256:digest(dataGzip),bytes:dataGzip.length,parts:dataParts},validation:{webAssemblyValidate:true,originalDataUnchanged:true,originalLoaderUnchanged:true}},null,2));
console.log('Installed original native Crazy Grand Prix assets with explicit local-platform adapter:',target);
