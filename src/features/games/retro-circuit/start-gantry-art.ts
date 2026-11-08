/** Original integer-pixel START gantry for the Circuit source-study courses.
 * Observed idea: two lattice uprights, overhead START panel and race checks.
 * All contours, support intervals, glyphs and palette are authored independently.
 * Native256x96; ground[128,94]; support feet[20,94] and[236,94]. */
export const START_GANTRY_ART_VERSION='circuit-start-gantry-original-1.0.0';
export const START_GANTRY_ART_METADATA={
  native:[256,96],anchor:[128,94],feet:[[20,94],[236,94]],
  authored:true,commercialPixels:false,tracedContours:false,approval:'reference',
}as const;
const letters:Record<string,readonly string[]>={
  S:['11111','10000','10000','11111','00001','00001','11111'],
  T:['11111','00100','00100','00100','00100','00100','00100'],
  A:['01110','11011','10001','11111','10001','10001','10001'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
};
export function paintStartGantry(c:CanvasRenderingContext2D){
  c.clearRect(0,0,256,96);c.imageSmoothingEnabled=false;
  const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  // Transparent gaps remain genuinely open; the uprights are not solid columns.
  for(const x of [14,230]){
    r(x,26,3,68,'#263040');r(x+3,26,2,68,'#bdc5c0');r(x+10,26,3,68,'#263040');r(x+9,26,2,68,'#788b96');
    r(x+1,28,1,64,'#e2ded0');r(x+11,28,1,64,'#43526c');
    for(const y of [35,49,63,77,90]){r(x+3,y,8,3,'#415168');r(x+3,y,8,1,'#b9c3c0');}
    r(x-3,93,19,2,'#263040');r(x-1,92,15,2,'#8d9b9e');r(x+1,92,10,1,'#cbd0c1');
  }
  // One continuous broad beam, with original block glyphs and check patterns.
  r(3,7,250,24,'#263040');r(5,9,246,20,'#798b98');r(6,10,244,18,'#eeead8');r(6,10,244,1,'#fff8e3');r(6,28,244,2,'#3e4d63');
  r(65,10,126,18,'#fff4da');r(65,27,126,1,'#c6bfa7');
  for(const x0 of [7,193]){
    r(x0,11,56,16,'#dcded1');
    for(let row=0;row<4;row++)for(let col=0;col<14;col++)if((row+col)%2===0)r(x0+col*4,11+row*4,4,4,'#263040');
  }
  // 5x7 original monospace, 3x2 holds; not the source game's italic font.
  const text='START',width=88,start=128-width/2;
  for(let i=0;i<text.length;i++){
    const glyph=letters[text[i]];
    for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(glyph[y][x]==='1'){
      r(start+i*18+x*3+1,13+y*2,3,2,'#a2342b');r(start+i*18+x*3,12+y*2,3,2,'#d64b32');
    }
  }
  // Exposed side collars make the support/beam joint unambiguous at mid distance.
  for(const x of [12,228]){r(x,24,17,8,'#263040');r(x+2,25,13,4,'#71838f');r(x+3,25,3,3,'#d3d5c7');r(x+10,26,3,2,'#354358');}
}
