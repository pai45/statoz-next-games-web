import fs from 'node:fs/promises';
import path from 'node:path';

/** An offline review artifact using unretouched captures from the real renderer. */
export async function writeComparison(directory) {
  const views=['body','face','feet','back','defense','run','shoot','roster','broadcast'];
  const options=views.map(view=>`<option value="${view}">${view==='feet'?'Footwear':view[0].toUpperCase()+view.slice(1)}</option>`).join('');
  await fs.writeFile(path.join(directory,'comparison.html'),`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hoop Legacy athlete review</title><style>
*{box-sizing:border-box}body{margin:0;background:#131516;color:#f5f2ec;font:16px system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:24px}h1{font-size:28px;margin:0 0 8px}p{max-width:850px;color:#c6c7c4;line-height:1.5}label{display:block;margin:18px 0 10px}select{font:inherit;background:#26292b;color:inherit;padding:8px;border:1px solid #7c807d;border-radius:5px}input{width:100%;accent-color:#eab65f}.stage{position:relative;width:100%;aspect-ratio:6/5;background:#08090a;--split:50%}.stage img{position:absolute;width:100%;height:100%;object-fit:contain}.stage .before{clip-path:inset(0 calc(100% - var(--split)) 0 0)}.stage:after{content:'';position:absolute;top:0;bottom:0;left:var(--split);width:2px;background:#fff}.tags{display:flex;justify-content:space-between;font-size:14px;margin:8px 0}a{color:#eab65f}small{color:#c6c7c4}
</style><main><h1>Hoop Legacy athlete review</h1>
<p>Identical camera, team, renderer and animation. Left: imported procedural character. Right: the authored athlete used in the game. These captures are unretouched.</p>
<label>Review view <select id="view">${options}</select></label>
<div class="tags"><span>Imported baseline</span><span>Authored athlete</span></div>
<div class="stage" id="stage"><img id="after" src="after-body.png" alt="Authored athlete"><img class="before" id="before" src="before-body.png" alt="Original athlete"></div>
<label>Move comparison divider <input id="divider" type="range" min="0" max="100" value="50"></label>
<p>Includes a conformed body and head, seeded face/build morphs, skin detail/normal maps, fitted eyes, original basketball uniform and shoes, and ten hairstyle choices. Close-ups use the hero mesh; live matches use the gameplay tier.</p>
<small>CC0 source notices and hashes ship with the game. Cloth uses authored folds; hair and facial expression remain simplified. Headless browser timings do not measure physical phone GPU performance. <a href="review.json">Renderer and motion results</a> · <a href="asset-check.json">Asset budgets</a> · <a href="runtime.json">Runtime checks</a></small>
</main><script>
const view=document.getElementById('view'),stage=document.getElementById('stage');
view.addEventListener('change',()=>{document.getElementById('before').src='before-'+view.value+'.png';document.getElementById('after').src='after-'+view.value+'.png';});
document.getElementById('divider').addEventListener('input',event=>stage.style.setProperty('--split',event.target.value+'%'));
</script></html>`);
}
