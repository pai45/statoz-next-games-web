import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve('public/games/retro-football'),port=Number(process.argv[2]||3064);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png','.wav':'audio/wav','.txt':'text/plain','.map':'application/json'};
http.createServer(async(req,res)=>{try{
    if(!['GET','HEAD'].includes(req.method))throw Error('Method');
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname==='/offline'){
        const html=await fs.readFile(path.resolve('public/embedded-games/retro-football/index.html'),'utf8');
        res.writeHead(200,{'Content-Type':mime['.html'],'Cache-Control':'no-store'});res.end(html);return;
    }
    const relative=decodeURIComponent(url.pathname==='/'?'index.html':url.pathname.slice(1)),file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||!mime[path.extname(file)])throw Error('Path');
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
}catch{res.writeHead(404);res.end('Local game file unavailable.');}}).listen(port,'127.0.0.1',()=>console.log('Retro Football handheld: http://127.0.0.1:'+port+'/'));
