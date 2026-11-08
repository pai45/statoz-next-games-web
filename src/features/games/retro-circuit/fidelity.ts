import type {TrackDefinition,VehicleDefinition,VehicleId} from './types';

/** Video-calibrated presentation and proposed response tuning, NOT SNES code. */
export const FIDELITY_VERSION='top-gear-study-1';
export const profileFor=(track:TrackDefinition)=>track.profile??'arcade';
export const displayFor=(track:TrackDefinition)=>profileFor(track)==='reference'
 ? {width:480,height:180,horizon:48,roadHeight:136,ground:68,stripe:18}
 : {width:480,height:270,horizon:70,roadHeight:200,ground:100,stripe:38};
export const sequenceFor=(track:TrackDefinition)=>profileFor(track)==='reference'
 ? {grid:3,go:1.5,finish:4.4,fade:3.5,dnf:2.4}
 : {grid:3,go:1.1,finish:2.2,fade:1.8,dnf:1.1};
const tuning:Record<VehicleId,Pick<VehicleDefinition,'maxSpeed'|'acceleration'|'grip'|'fuelRate'>>={
 vector:{maxSpeed:211/3.6,acceleration:16,grip:1.12,fuelRate:1},
 comet:{maxSpeed:237/3.6,acceleration:12.3,grip:1.02,fuelRate:1.08},
 kestrel:{maxSpeed:220/3.6,acceleration:13,grip:1.23,fuelRate:.94},
 nomad:{maxSpeed:220/3.6,acceleration:14,grip:1.16,fuelRate:.82},
};
export const calibratedVehicle=(track:TrackDefinition,vehicle:VehicleDefinition):VehicleDefinition=>
 profileFor(track)==='reference'?{...vehicle,...tuning[vehicle.id]}:vehicle;

/** Retained clips support themes and event order; lengths/connecting geometry are inferred. */
export const referenceEvidence={
 primary:{url:'https://www.youtube.com/watch?v=gFMgYrdlTF8',unit:'km/h',region:'unconfirmed',courseCardSeconds:125,gridSeconds:132.5},
 secondary:{url:'https://www.youtube.com/watch?v=E9QJZSBpvg0',unit:'MPH',region:'unconfirmed'},
 observations:['125s Las Vegas card: 1.20 km, three laps','140s upper white car: 125 km/h; first source finish 1:04.96','secondary recording has alternating black/yellow roadworks; absent from primary first race','green crests obscure skyline','finish car recedes before classification'],
 adaptations:['one full driving view','480 × 180 logical landscape field','original car artwork','touch steering left / pedals and nitro right','local records only','automatic transmission','original music'],
 uncertainties:['unknown controller inputs','recording frames do not establish native console cadence','track geometry and world-distance scale inferred','handling and fuel rates are bounded design tuning'],
} as const;
