export type Vec2 = {
  x: number;
  y: number;
};

export type BreakableBlockDef = {
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  health?: number;
  color?: string;
};

export type BumperDef = {
  x: number;
  y: number;
  radius: number;
  color?: string;
};

export type MovingObstacleDef = {
  x: number;
  y: number;
  width: number;
  height: number;
  axis: 'x' | 'y';
  amplitude: number;
  speed: number;
  color?: string;
};

export type LevelDef = {
  id: string;
  name: string;
  par: number;
  hint: string;
  anchor: Vec2;
  ball: Vec2;
  ropeLength: number;
  hole: Vec2 & { radius: number };
  blocks: BreakableBlockDef[];
  bumpers?: BumperDef[];
  moving?: MovingObstacleDef[];
  extraWalls?: BreakableBlockDef[];
};
