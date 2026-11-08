import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const root=process.cwd(),source=path.join(root,'src/features/games/retro-innings/runtime'),out=path.join(root,'public/games/retro-innings');
let base=await fs.readFile(path.join(source,'match-template.html'),'utf8'),css=await fs.readFile(path.join(source,'cricket-console.css'),'utf8');
const runtimeData=JSON.parse(await fs.readFile(path.join(source,'assets.json'),'utf8')).runtime;
// The source-derived OFF contact composite is a pinned raster asset. Both the
// Canvas fallback and Three.js presentation consume the same corrected atlas.
const battingAtlas=await fs.readFile(path.join(source,'bat-right-handed.png'));
const batTexture=/"bat":"data:image\/png;base64,[^"]+"/;
if(!batTexture.test(base))throw Error('Expected original batting texture in cricket template');
base=base.replace(batTexture,'"bat":"data:image/png;base64,'+battingAtlas.toString('base64')+'"');
const dataStart=base.indexOf('const DATA='),dataEnd=base.indexOf(';const TEXTURES=',dataStart);
if(dataStart<0||dataEnd<=dataStart)throw Error('Expected one pinned cricket metadata boundary');
base=base.slice(0,dataStart)+'const DATA='+JSON.stringify(runtimeData)+base.slice(dataEnd);
const pinned={name:'cricket-local-source',setup(api){api.onResolve({filter:/.*/},args=>({path:args.path==='three'?path.join(root,'node_modules/three/build/three.module.js'):path.resolve(args.resolveDir,/\.(js|ts|css)$/.test(args.path)?args.path:args.path+'.ts'),namespace:'local'}));api.onLoad({filter:/.*/,namespace:'local'},async args=>({contents:await fs.readFile(args.path,'utf8'),loader:args.path.endsWith('.css')?'css':args.path.endsWith('.ts')?'ts':'js',resolveDir:path.dirname(args.path)}));}};
// Always compile the authoritative simulation; never ship stale inlined gameplay.
if(base.split('/*__CRICKET_SIMULATION__*/').length!==2)throw Error('Expected one simulation marker');
const simulation=await fs.readFile(path.join(source,'simulation.mjs'),'utf8');
const engine=await build({stdin:{contents:simulation.replace('export function createCricketSimulation','function createCricketSimulation')+'\nwindow.createCricketSimulation=createCricketSimulation;',resolveDir:source,loader:'js'},bundle:true,write:false,format:'iife',target:'es2022',minify:false});
base=base.replace('/*__CRICKET_SIMULATION__*/',()=>engine.outputFiles[0].text.replaceAll('</script','<\\/script'));
const result=await build({stdin:{contents:await fs.readFile(path.join(source,'three-cricket-entry.ts'),'utf8'),resolveDir:source,loader:'ts'},outdir:'cricket',plugins:[pinned],tsconfigRaw:{compilerOptions:{}},bundle:true,write:false,format:'iife',target:'es2022',minify:true});
css+='\n'+(result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'');
const bridge=`window.presentationBridge={canvas,images,data:DATA,view:()=>({batterPose:batterPose(),batterOrigin:batterOrigin(),keeperPose:keeperPose(),fieldPoses:S.fielders.map(f=>fieldPose(f)),runnerPositions:runnerPositions(),bowlerPosition:bowlerPosition(),broadcast:broadcastModel(),runningInset:runningInsetModel()})};`;
const html=base.replace('</head>','<style>'+css+'</style></head>').replace('width=device-width,initial-scale=1','width=device-width,initial-scale=1,viewport-fit=cover').replace('</script></body>',()=>bridge+'</script><script>'+result.outputFiles.find(f=>f.path.endsWith('.js')).text.replaceAll('</script','<\\/script')+'</script></body>');
const normalizedHtml=html.replace(/\r\n/g,'\n');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'index.html'),normalizedHtml);console.log('Built private handheld Retro Innings: '+Buffer.byteLength(normalizedHtml)+' bytes.');

const provenanceFile=path.join(out,'provenance.json');const provenance=JSON.parse(await fs.readFile(provenanceFile,'utf8'));provenance.sha256=createHash('sha256').update(normalizedHtml).digest('hex');await fs.writeFile(provenanceFile,JSON.stringify(provenance,null,2)+'\n');
