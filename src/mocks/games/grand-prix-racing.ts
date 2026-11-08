import type { RacingTeam } from '@/domain/grand-prix-racing';
/** Invented teams and drivers. All cars use identical performance parameters. */
export const racingTeams: readonly RacingTeam[] = [
    { id: 'rosso', name: 'Rosso Corsa', color: '#e34035', accent: '#f6e6c9', drivers: ['Elio Venturi', 'Mateo Solano'] },
    { id: 'northstar', name: 'Northstar', color: '#e6ece8', accent: '#2087b5', drivers: ['Finn Halberg', 'Emil Strand'] },
    { id: 'saffron', name: 'Saffron Racing', color: '#ee951e', accent: '#222a35', drivers: ['Arun Mehra', 'Nila Desai'] },
    { id: 'verdant', name: 'Verdant Works', color: '#25876c', accent: '#e4ca75', drivers: ['Luca Arden', 'Ada Moreau'] },
    { id: 'cobalt', name: 'Cobalt Union', color: '#3379cc', accent: '#efefea', drivers: ['Ren Akiyama', 'Noah Marin'] },
    { id: 'violet', name: 'Violet Motors', color: '#9470c8', accent: '#f1de96', drivers: ['Iris Valen', 'Theo Lavigne'] },
    { id: 'solstice', name: 'Solstice', color: '#e6be3e', accent: '#363b41', drivers: ['Zara Sethi', 'Leon Cruz'] },
    { id: 'atlas', name: 'Atlas Sport', color: '#343d48', accent: '#e96050', drivers: ['Omar Kader', 'Mila Ferran'] },
    { id: 'coral', name: 'Coral Coast', color: '#e67f87', accent: '#faf3dc', drivers: ['Eva Rios', 'Sora Hoshino'] },
    { id: 'glacier', name: 'Glacier', color: '#79c5c4', accent: '#283d4a', drivers: ['Alva Nyberg', 'Kai Bellamy'] },
];
