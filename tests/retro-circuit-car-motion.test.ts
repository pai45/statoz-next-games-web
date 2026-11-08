import {test} from 'node:test';import assert from 'node:assert/strict';
import {carIds,carPixels,carPoseAnchors,farCarPixels,overheadCarPixels} from '../src/features/games/retro-circuit/car-family';
import {RaceSimulation} from '../src/features/games/retro-circuit/simulation';
import {roadProjection,projectedCar,CAMERA_TRAIL} from '../src/features/games/retro-circuit/projection';
test('left/right car perspective follows steering without moving ground or detaching effects',()=>{
 for(const id of carIds){const neutral=carPoseAnchors(id,0);
 for(const turn of [-1,-.5,.5,1]){const anchors=carPoseAnchors(id,turn);
 assert.ok((anchors.cabin[0]-anchors.rearAxle[0])*turn>0,'cabin must point into named turn');
 assert.deepEqual(anchors.ground,neutral.ground);
 for(const point of [...anchors.exhausts,...anchors.lamps])assert.ok(point[0]>8&&point[0]<72&&point[1]>=20&&point[1]<34);
 }const width=(pose:'straight'|'left'|'right')=>{const pixels=carPixels(id,pose);return Math.max(...pixels.map(p=>p.x+p.width))-Math.min(...pixels.map(p=>p.x));};
 assert.ok(width('left')>width('straight'),'visible flank must widen silhouette');assert.ok(width('right')>width('straight'));
 assert.ok(farCarPixels(id).every(p=>p.x>=0&&p.y>=0&&p.x+p.width<=24&&p.y+p.height<=14));
 assert.ok(overheadCarPixels(id).every(p=>p.x>=0&&p.y>=0&&p.x+p.width<=48&&p.y+p.height<=80));
 }
});
test('reference camera follows physical lane changes while player stays centred and traffic moves with road',()=>{
 const game=new RaceSimulation({trackId:'vegas',vehicleId:'vector',seed:42,sessionId:'car-camera'});game.phase='racing';game.cars[0].distance=160;game.cars[0].speed=55;
 const centres:number[]=[],roadCentres:number[]=[];for(const x of [-1,0,1]){game.cars[0].x=x;const points=roadProjection(game.snapshot(),game.track);centres.push(projectedCar(CAMERA_TRAIL,x,points)!.x);roadCentres.push(points[12].x);}
 assert.ok(Math.max(...centres)-Math.min(...centres)<.001);assert.ok(roadCentres[0]>roadCentres[1]&&roadCentres[1]>roadCentres[2]);
});
