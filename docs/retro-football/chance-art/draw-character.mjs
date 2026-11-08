/** Original close-view anatomy. Integer-grid clusters, not traced source-game contours. */
export function drawCharacter(phase,team){
 const c={edge:'#29202a',skin:'#d8844f',skinLight:'#f8bb77',skinMid:'#ea9b59',skinShade:'#a94c32',deep:'#71312b',hair:'#713a18',hairDark:'#49251c',hairMid:'#aa5b1d',hairLight:'#d88a2d',hairSun:'#e5ac47',shirt:team?'#e45843':'#27c7dd',shirtShade:team?'#a8343d':'#08738d',shirtDeep:team?'#762f39':'#07536c',shirtMid:team?'#f77b51':'#56dbe8',shirtLight:team?'#ffb47a':'#a2f4ef',shorts:'#182434',shortMid:'#29374a',shortLight:'#43536b',shortDark:'#0b1524',sock:team?'#d34b42':'#24adc8',sockLight:team?'#fa8861':'#62d6e3',sockDark:team?'#852d39':'#126c8c',boot:'#102137',bootLight:'#36516d',sole:'#c9cdb9'};
 const out=[],lean=phase.lean,poly=(pts,color)=>out.push(`<polygon fill="${color}" points="${pts.map(p=>p.map(Math.round).join(',')).join(' ')}"/>`),shape=(d,color,shift=0)=>out.push(`<path fill="${color}" d="${d}"${shift?` transform="translate(${shift} 0)"`:''}/>`),rect=(x,y,w,h,color)=>out.push(`<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${w}" height="${h}" fill="${color}"/>`);
 const shift=p=>[p[0]+lean,p[1]],norm=(a,b)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]);return[-(b[1]-a[1])/d,(b[0]-a[0])/d];};
 // Tapered muscle segments and rounded joint clusters keep elbows/knees connected.
 const segment=(a,b,wa,wb,base,shadow,light)=>{const n=norm(a,b),p=(q,w,sign)=>[q[0]+n[0]*w*sign,q[1]+n[1]*w*sign];poly([p(a,wa/2+1,1),p(b,wb/2+1,1),p(b,wb/2+1,-1),p(a,wa/2+1,-1)],c.edge);poly([p(a,wa/2,1),p(b,wb/2,1),p(b,wb/2,-1),p(a,wa/2,-1)],base);poly([p(a,wa/2,1),p(b,wb/2,1),p(b,wb*.12,1),p(a,wa*.12,1)],shadow);poly([p(a,wa*.35,-1),p(b,wb*.33,-1),p(b,wb*.12,-1),p(a,wa*.08,-1)],light);};
 const joint=(p,r,color)=>{const [x,y]=p;poly([[x-r+2,y-r],[x+r-2,y-r],[x+r,y-r+2],[x+r,y+r-2],[x+r-2,y+r],[x-r+2,y+r],[x-r,y+r-2],[x-r,y-r+2]],color);};
 const boot=(ankle,toe)=>{const n=norm(ankle,toe),along=[toe[0]-ankle[0],toe[1]-ankle[1]],d=Math.hypot(...along),u=along.map(v=>v/d),p=(q,along,side)=>[q[0]+u[0]*along+n[0]*side,q[1]+u[1]*along+n[1]*side];poly([p(ankle,-5,5),p(toe,5,5),p(toe,8,1),p(toe,5,-5),p(ankle,1,-6),p(ankle,-5,-3)],c.boot);poly([p(ankle,-4,5),p(toe,5,5),p(toe,8,2),p(toe,4,2),p(ankle,-3,2)],c.sole);poly([p(ankle,0,-4),p(toe,3,-4),p(toe,2,-1),p(ankle,2,0)],c.bootLight);for(let i=0;i<3;i++){const q=p(ankle,2+i*3,-2);rect(q[0],q[1],2,1,c.sole);}};
 const leg=(hip,knee,ankle,toe,far=false)=>{segment(hip,knee,21,14,far?c.skin:c.skinMid,c.skinShade,c.skinLight);joint(knee,6,c.skinMid);const sockTop=[knee[0]+(ankle[0]-knee[0])*.22,knee[1]+(ankle[1]-knee[1])*.22];segment(knee,sockTop,13,13,c.skin,c.skinShade,c.skinLight);segment(sockTop,ankle,15,9,c.sock,c.sockDark,c.sockLight);boot(ankle,toe);};
 const plant=phase.plant?[shift(phase.plant[0]),...phase.plant.slice(1)]:[[52+lean,146],[57,177],[66,210],[83,218]];
 leg(...plant,true);
 // Far arm behind the ribcage: shoulder, elbow and wrist form one silhouette.
 const arm=phase.arm.map(shift);segment(arm[0],arm[1],15,10,c.skinMid,c.skinShade,c.skinLight);joint(arm[1],4,c.skin);segment(arm[1],arm[2],11,7,c.skinMid,c.skinShade,c.skinLight);joint(arm[2],4,c.skinMid);
 // Wide rear three-quarter shirt, curved waist, sleeve caps and shoulder blade planes.
 shape('M28 93 Q38 86 51 87 L61 87 Q72 89 77 102 L74 113 L69 115 L68 131 Q68 140 61 145 L42 147 L30 137 Q31 123 25 111 Z',c.edge,lean);
 shape('M31 94 Q42 88 54 90 L62 89 Q69 92 73 103 L71 110 L65 111 L65 132 Q65 139 59 142 L43 144 L33 135 Q35 122 29 110 Z',c.shirt,lean);
 shape('M55 92 Q64 91 69 101 L68 109 L62 111 L60 130 L64 136 L59 141 L50 143 L48 136 L53 123 Z',c.shirtShade,lean);
 shape('M31 98 Q36 92 43 92 L42 108 L36 115 L37 128 L34 132 L32 120 L28 110 Z',c.shirtMid,lean);
 shape('M42 93 L53 93 L50 98 L46 107 L43 109 L44 100 Z',c.shirtLight,lean);
 shape('M52 112 L61 105 L59 114 L55 119 L56 128 L52 132 L50 124 Z',c.shirtDeep,lean);
 shape('M36 126 L41 131 L47 132 L49 138 L43 137 L39 133 L33 132 Z',c.shirtShade,lean);
 shape('M40 140 L47 138 L52 140 L58 138 L62 139 L58 142 L45 144 Z',c.shirtLight,lean);
 // Shorts are loose fabric around the hips, not a single angular upper-leg block.
 shape('M42 138 Q54 140 65 134 L73 144 L79 155 L73 165 L65 170 L55 164 L49 161 L44 157 L38 151 Z',c.shortDark,lean);
 shape('M44 141 Q55 144 65 138 L69 146 L75 155 L69 163 L64 166 L55 160 L49 158 L42 151 Z',c.shorts,lean);
 shape('M46 143 L54 145 L55 151 L61 155 L57 157 L49 153 L44 150 Z',c.shortMid,lean);
 shape('M60 142 L66 140 L68 146 L72 152 L69 155 L65 151 L64 146 Z',c.shortLight,lean);
 shape('M48 153 L53 156 L57 158 L56 162 L50 160 L44 155 Z',c.shortDark,lean);
 const kick=[shift(phase.leg[0]),...phase.leg.slice(1)];leg(...kick);
 // Near arm has a rounded deltoid, biceps shadow, elbow and smaller articulated hand.
 const elbow=shift([28,126]),wrist=shift([34,146]),shoulder=shift([33,102]);segment(shoulder,elbow,17,11,c.skinMid,c.skinShade,c.skinLight);joint(elbow,5,c.skin);segment(elbow,wrist,12,7,c.skinMid,c.skinShade,c.skinLight);joint(wrist,4,c.skinMid);
 const hand=shift([36,151]);segment(wrist,hand,7,6,c.skin,c.skinShade,c.skinLight);rect(hand[0]-1,hand[1]+1,2,2,c.skinShade);
 shape('M28 97 L38 96 L40 103 L37 111 L30 113 L26 108 Z',c.shirt,lean);shape('M28 106 L36 108 L37 112 L30 114 L27 110 Z',c.shirtShade,lean);
 // Neck and head mostly seen from behind; a narrow cheek/ear provides orientation.
 shape('M49 82 L60 80 L64 91 L59 98 L48 93 L45 88 Z',c.skinShade,lean);shape('M54 84 L59 84 L60 91 L56 94 L51 91 Z',c.skinMid,lean);
 shape('M44 57 Q52 50 60 55 Q67 58 67 67 L65 74 L68 77 L64 80 L61 88 L54 89 L47 82 L41 69 Z',c.skinShade,lean);
 shape('M59 60 L64 64 L63 72 L65 76 L61 78 L60 83 L56 84 L54 76 Z',c.skinMid,lean);shape('M62 63 L65 66 L63 69 L61 68 Z',c.skinLight,lean);rect(60+lean,73,2,4,c.skinShade);
 // Long copper hair follows the head into the nape with irregular purpose-built clusters.
 const drift=phase.id==='entry'||phase.id==='windup'?-3:phase.id==='follow'?2:0;
 shape('M40 59 L43 54 L51 51 L58 52 L63 55 L67 60 L66 67 L62 72 L61 79 L57 83 L58 89 L53 94 L45 94 L40 90 L35 92 L36 85 L31 87 L34 79 L30 80 L34 73 L32 69 L38 66 L36 63 Z',c.hairDark,lean+drift);
 shape('M42 59 L48 55 L56 54 L62 58 L64 62 L61 67 L58 70 L57 79 L53 82 L54 89 L49 91 L43 89 L39 84 L36 85 L39 76 L36 77 L39 69 L39 64 Z',c.hair,lean+drift);
 shape('M45 58 L52 55 L58 56 L61 59 L56 61 L51 65 L47 69 L44 69 L46 64 L42 66 Z',c.hairMid,lean+drift);
 shape('M49 57 L55 56 L58 58 L52 60 L49 63 L46 63 Z',c.hairLight,lean+drift);
 shape('M54 63 L60 61 L58 68 L54 72 L52 79 L48 83 L47 88 L43 86 L46 79 L47 72 Z',c.hairMid,lean+drift);
 shape('M55 66 L58 63 L56 70 L52 74 L51 78 L48 80 L50 73 Z',c.hairLight,lean+drift);
 shape('M41 72 L44 69 L43 77 L40 82 L40 86 L37 86 L39 79 Z',c.hairMid,lean+drift);
 rect(50+lean+drift,58,2,1,c.hairSun);rect(54+lean+drift,66,1,3,c.hairSun);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="224" viewBox="0 0 160 224" shape-rendering="crispEdges">${out.join('')}</svg>`;
}
