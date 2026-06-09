import type { LevelDef } from './types';

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;

export const levels: LevelDef[] = [
  {
    id: 'swing-101',
    name: 'Swing 101',
    par: 2,
    hint: 'Tire la boule, relâche, puis laisse le pendule faire le sale boulot.',
    anchor: { x: 210, y: 130 },
    ball: { x: 230, y: 300 },
    ropeLength: 185,
    hole: { x: 790, y: 430, radius: 35 },
    blocks: [
      { x: 570, y: 410, width: 70, height: 30, health: 1, color: '#42e8b4' },
      { x: 635, y: 380, width: 90, height: 28, angle: -0.18, health: 1, color: '#7cf5ff' },
    ],
    bumpers: [{ x: 420, y: 350, radius: 30, color: '#ffce3a' }],
    extraWalls: [{ x: 720, y: 475, width: 210, height: 18, angle: -0.12, color: '#17223d' }],
  },
  {
    id: 'glass-wall',
    name: 'Le mur de briques',
    par: 3,
    hint: 'Casse le mur, mais garde assez d’énergie pour tomber dans le trou.',
    anchor: { x: 180, y: 110 },
    ball: { x: 170, y: 300 },
    ropeLength: 205,
    hole: { x: 820, y: 420, radius: 34 },
    blocks: [
      { x: 510, y: 425, width: 62, height: 28, health: 2, color: '#ff7aa8' },
      { x: 575, y: 425, width: 62, height: 28, health: 2, color: '#ff7aa8' },
      { x: 540, y: 390, width: 62, height: 28, health: 2, color: '#f973c4' },
      { x: 605, y: 390, width: 62, height: 28, health: 2, color: '#f973c4' },
      { x: 570, y: 355, width: 62, height: 28, health: 2, color: '#c084fc' },
    ],
    bumpers: [{ x: 360, y: 390, radius: 24, color: '#ffce3a' }],
    extraWalls: [
      { x: 770, y: 470, width: 240, height: 18, angle: -0.08, color: '#17223d' },
      { x: 860, y: 382, width: 22, height: 120, angle: 0.05, color: '#17223d' },
    ],
  },
  {
    id: 'moving-gate',
    name: 'Portail nerveux',
    par: 4,
    hint: 'Le bumper mobile peut te sauver ou te ruiner. Timing > force brute.',
    anchor: { x: 210, y: 120 },
    ball: { x: 220, y: 315 },
    ropeLength: 210,
    hole: { x: 805, y: 405, radius: 34 },
    blocks: [
      { x: 610, y: 430, width: 74, height: 28, health: 2, color: '#42e8b4' },
      { x: 665, y: 395, width: 74, height: 28, health: 2, color: '#7cf5ff' },
      { x: 705, y: 360, width: 74, height: 28, health: 2, color: '#c084fc' },
    ],
    bumpers: [
      { x: 410, y: 370, radius: 28, color: '#ffce3a' },
      { x: 540, y: 290, radius: 22, color: '#ff8a3d' },
    ],
    moving: [{ x: 555, y: 455, width: 140, height: 24, axis: 'x', amplitude: 90, speed: 0.0028, color: '#37d5ff' }],
    extraWalls: [
      { x: 780, y: 465, width: 220, height: 20, angle: -0.16, color: '#17223d' },
      { x: 880, y: 365, width: 22, height: 140, angle: 0.08, color: '#17223d' },
    ],
  },
];
