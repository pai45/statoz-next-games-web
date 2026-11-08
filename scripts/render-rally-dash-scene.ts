// Writes the Rally Dash catalog tile scene (220×160 SVG) from the game's own car paths,
// drawn in the host's discovery-tile palette so it sits beside the other tiles.
//   npx tsx scripts/render-rally-dash-scene.ts
import { writeFileSync } from 'node:fs';
import { carShapes } from '../src/features/games/rally-dash/art';

const ink = '#0B1322', deep = '#111B28', road = '#314158', inner = '#1D293D', light = '#A6B8CD', accent = '#FF777D';
// Map each car layer (see carShapes) to a tile colour: tyres, body, stripes, trim, highlight, glass, glint, rear glass, mirrors, vent, spoiler, flaps, brake lights, bumper.
const fills = [ink, light, accent, road, '#ffffff', deep, '#ffffff', deep, road, ink, road, ink, accent, deep];
const car = carShapes(0).map((shape, i) => `<path d="${shape.d}" fill="${fills[i]}"${shape.opacity ? ` opacity="${shape.opacity}"` : ''}/>`).join('')
  + [26, 42, 58, 74].map(x => `<circle cx="${x}" cy="15" r="6" fill="#EAF1F8" stroke="${ink}" stroke-width="2"/>`).join('');
const puff = (x: number, y: number, r: number, o: number, c = light) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`;
const pine = (x: number, y: number, r: number) => `<circle cx="${x + 3}" cy="${y + 4}" r="${r}" fill="${ink}" opacity=".7"/><circle cx="${x}" cy="${y}" r="${r}" fill="${inner}"/><circle cx="${x - 1}" cy="${y - 1.5}" r="${r * .66}" fill="${road}"/><circle cx="${x - 2}" cy="${y - 3}" r="${r * .3}" fill="#4A5D78"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160"><title>RALLY DASH</title>`
  + `<ellipse cx="111" cy="141" rx="88" ry="8" fill="${ink}" opacity=".65"/>`
  + `<path d="M-6 150C40 118 70 120 102 92S150 34 226 20" fill="none" stroke="${road}" stroke-width="54" stroke-linecap="round"/>`
  + `<path d="M-6 150C40 118 70 120 102 92S150 34 226 20" fill="none" stroke="${inner}" stroke-width="40" stroke-linecap="round"/>`
  + `<path d="M-6 142C40 110 70 112 100 84S150 26 226 12M-6 158C40 126 72 128 104 100S152 42 226 28" fill="none" stroke="${light}" stroke-width="1.2" opacity=".4" stroke-dasharray="3 4"/>`
  + `<path d="M24 136C58 114 80 112 104 90S148 40 196 26" fill="none" stroke="${accent}" stroke-width="1.6" opacity=".65" stroke-linecap="round"/>`
  + puff(70, 122, 16, .22) + puff(56, 130, 12, .18) + puff(84, 112, 12, .3) + puff(92, 104, 9, .38) + puff(44, 136, 9, .14) + puff(76, 128, 6, .3, '#C9D6E4')
  + `<g transform="translate(116 80) rotate(28) scale(.36) translate(-50 -103)">${car}</g>`
  + pine(22, 28, 13) + pine(44, 16, 10) + pine(14, 62, 9) + pine(196, 92, 14) + pine(176, 118, 11) + pine(204, 136, 9)
  + `</svg>\n`;
writeFileSync('public/assets/games/rally-dash/scene.svg', svg);
console.log('wrote public/assets/games/rally-dash/scene.svg', svg.length, 'bytes');
