import {sportOrder, sportModules, type Sport} from './sports';
export type GameSport = Sport | 'golf' | 'archery';
export const gameSportOrder: GameSport[] = [...sportOrder, 'golf', 'archery'];
export const gameSportModules = {...sportModules, archery: {sport:'archery' as const,label:'Archery',shortLabel:'ARCHERY',accent:'gold' as const}, golf: {sport: 'golf' as const, label: 'Golf', shortLabel: 'GOLF', accent: 'lime' as const}};
export const gameSportModuleFor = (sport: GameSport) => gameSportModules[sport];
