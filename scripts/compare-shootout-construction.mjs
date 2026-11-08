import sharp from 'sharp';
const root='docs/penalty-shootout/evidence-model-v7';
const overlay=[];
for(const [row,dir] of ['before','after'].entries())for(let preset=0;preset<4;preset++){
const buffer=await sharp(`${root}/${dir}/preset-${preset}-front.png`).resize(300,273).toBuffer();overlay.push({input:buffer,left:preset*300,top:44+row*312});
}
const label=Buffer.from(`<svg width="1200" height="668"><style>text{font-family:Arial;font-size:22px;fill:#fff}</style><text x="16" y="30">BEFORE | Original v6 models</text><text x="16" y="342">AFTER | Refined v7 construction - four original presets</text></svg>`);overlay.push({input:label,left:0,top:0});
await sharp({create:{width:1200,height:668,channels:3,background:'#202b2f'}}).composite(overlay).png().toFile(`${root}/comparison.png`);
console.log('Character comparison written');
