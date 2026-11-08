import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RaceSimulation} from '../src/features/games/retro-circuit/simulation';
import {roadProjection,projectedCar,CAMERA_TRAIL,roadSteeringYaw} from '../src/features/games/retro-circuit/projection';
import {turnCarPixels,turnAmountFor,carPixels,carIds} from '../src/features/games/retro-circuit/car-family';
test('steering sweeps distant road opposite the car while preserving ego contact and depth',()=>{
 const g=new RaceSimulation({trackId:'vegas',vehicleId:'vector',seed:42,sessionId:'steer'});g.phase='racing';g.cars[0].distance=200;g.cars[0].speed=55;
 const neutral=roadProjection(g.snapshot(),g.track);
 for(const direction of [-1,1]){g.cars[0].steering=direction;const points=roadProjection(g.snapshot(),g.track);
 assert.equal(projectedCar(CAMERA_TRAIL,0,points)!.x,projectedCar(CAMERA_TRAIL,0,neutral)!.x);
 assert.ok((points[20].x-neutral[20].x)*direction < -45);
 assert.ok(Math.abs(points[20].x-neutral[20].x)>Math.abs(points[3].x-neutral[3].x));
 assert.deepEqual(points.map(p=>[p.y,p.half,p.nearClip]),neutral.map(p=>[p.y,p.half,p.nearClip]));}
 g.cars[0].speed=0;assert.equal(roadSteeringYaw(g.snapshot(),600),0);
 g.cars[0].speed=55;g.phase='finished';assert.equal(roadSteeringYaw(g.snapshot(),600),0);
});
test('all four authored car families have distinct intermediate poses and unchanged contact bounds',()=>{
 for(const id of carIds){assert.deepEqual(turnCarPixels(id,0),carPixels(id,'straight'));
 for(const sign of [-1,1]){const soft=turnCarPixels(id,sign*.4),full=turnCarPixels(id,sign);
 assert.notDeepEqual(soft,full);assert.notDeepEqual(soft,turnCarPixels(id,0));
 assert.deepEqual(full,carPixels(id,sign<0?'left':'right'));}}
 assert.deepEqual([0,.2,.7,-.2,-.7].map(turnAmountFor),[0,.5,1,-.5,-1]);
});
