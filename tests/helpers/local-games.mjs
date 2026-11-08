export const localGames=[
 {id:'stick-cricket',title:'STICK CRICKET CHASE',sport:'cricket',ready:()=>window.__stickCricketDebug?.ready},
 {id:'archery-test',title:'ARCHERY MASTER',sport:'archery',ready:()=>window.__archeryTestDebug?.ready},
 {id:'penalty-shooters-2',title:'PENALTY SHOOTERS 2',sport:'football',ready:()=>window.__penaltyLocalDebug?.layout==='pickLeague'},
 {id:'tennis-bits',title:'TENNIS BITS',sport:'tennis',ready:()=>!!window.tennisEngine},
 {id:'soccer-real',title:'SOCCER REAL',sport:'football',ready:()=>typeof window.s==='number'&&window.start_cnt>2},
 {id:'f1-racing',title:'RACER',href:'/play/racer',host:true,sport:'motorsport',ready:()=>window.__RACER_INSPECT__?.().status==='ready'},
];
