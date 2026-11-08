import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true}),out='test-results/penalty-cup-mobile';
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});page.setDefaultTimeout(15000);
 await page.goto('http://127.0.0.1:3199');const frame=()=>page.frames().find(f=>f.url().includes('/game?'));
 await frame().getByRole('button',{name:'Penalty Cup',exact:true}).click();await frame().getByRole('button',{name:/Start Cup/}).click();await frame().getByRole('button',{name:/Play match/}).waitFor();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('penalty-cup.local-preview.v1')));assert.equal(JSON.parse(stored.stores['penalty-cup.v1.local-preview']).version,2);
 await page.reload();await frame().getByRole('button',{name:/Continue Cup/}).click();await frame().getByRole('button',{name:/Play match/}).waitFor();
 await page.screenshot({path:out+'/preview-landscape.png'});await page.setViewportSize({width:390,height:844});assert.equal(await frame().locator('[data-cup-landscape]').evaluate(el=>el.clientWidth>el.clientHeight),true);await page.screenshot({path:out+'/preview-upright.png'});
 await fs.writeFile(out+'/preview-checks.json',JSON.stringify({url:'http://127.0.0.1:3199',landscape:true,uprightFallback:true,persistentSaveReload:true},null,2));console.log('Local preview: landscape, upright fallback and persistent save/reload passed.');
}finally{await browser.close();}
