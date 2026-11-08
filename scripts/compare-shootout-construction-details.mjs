import sharp from 'sharp';
const root='docs/penalty-shootout/evidence-model-v7',items=[];
for(const [col,dir] of ['before','after'].entries())for(const [row,name] of ['taker-body','glove-palm'].entries())items.push({input:await sharp(`${root}/${dir}/${name}.png`).resize(600,546).toBuffer(),left:col*600,top:row?630:40});
items.push({input:Buffer.from(`<svg width="1200" height="1180"><style>text{font-family:Arial;font-size:21px;fill:white}</style><text x="16" y="28">BEFORE V6 | Jersey</text><text x="616" y="28">AFTER V7 | Rebuilt torso and sleeve joins</text><text x="16" y="618">BEFORE V6 | Glove and exposed skin fingers</text><text x="616" y="618">AFTER V7 | Continuous glove and covered wrist</text></svg>`),left:0,top:0});
await sharp({create:{width:1200,height:1180,channels:3,background:'#202b2f'}}).composite(items).png().toFile(`${root}/construction-comparison.png`);console.log('Construction comparison saved');
