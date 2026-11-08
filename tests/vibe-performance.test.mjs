import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chooseRenderProfile} from '../src/features/games/vibe-basketball/render-profile.mjs';
test('ordinary phone launches choose the inexpensive renderer without requiring lite query flags',()=>{
 const profile=chooseRenderProfile({coarse:true,dpr:3});
 assert.equal(profile.fast,true);assert.equal(profile.bloom,false);assert.equal(profile.shadows,false);assert.equal(profile.antialias,false);assert.equal(profile.maxDpr,1);assert.equal(profile.adaptive,true);assert.ok(profile.maxPixels<=650000);
});
test('desktop Auto and explicit High retain the original full renderer',()=>{
 for(const options of [{coarse:false,dpr:3},{coarse:true,dpr:3,quality:'high'}]){
  const profile=chooseRenderProfile(options);assert.equal(profile.fast,false);assert.equal(profile.shadows,true);assert.equal(profile.bloom,true);assert.equal(profile.maxDpr,2);assert.equal(profile.adaptive,false);
 }
});
test('Performance works on desktop too, and legacy lite remains compatible',()=>{
 const low=chooseRenderProfile({quality:'performance',dpr:2});assert.equal(low.fast,true);assert.equal(low.maxDpr,.8);assert.equal(low.adaptive,true);
 assert.equal(chooseRenderProfile({quality:'high',lite:true,dpr:2}).fast,true);
 assert.equal(chooseRenderProfile({quality:'invalid',coarse:true}).requested,'auto');
});
