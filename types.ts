export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity {
  id: string;
  tag: string; // e.g., 'player', 'obstacle'
  pos: Position;
  size: Size;
  color: string;
  velocity: Position;
  rotation?: number; // In degrees
  hidden?: boolean;
  active: boolean;
  renderType?: 'rect' | 'text' | 'emoji' | 'image' | 'anim';
  renderContent?: string;
}

export interface Particle {
  id: string;
  text: string;
  pos: Position;
  velocity: Position;
  life: number; // 0 to 1
  color: string;
  size: number;
}

export interface UIElement {
  tag: string;
  value: string | number | boolean;
  hidden: boolean;
  position: Position;
  color?: string;
  type: 'text' | 'slider';
  min?: number;
  max?: number;
}

export interface OverlayState {
  active: boolean;
  content: string;
  type: 'text' | 'image' | 'video';
}

export interface GameState {
  vars: Record<string, number | string | boolean>;
  arrays: Record<string, any[]>;
  entities: Entity[];
  particles: Particle[]; // New: Notefyshics
  ui: Record<string, UIElement>;
  bgOffset: number;
  gameOver: boolean;
  stopped: boolean;
  resetRequested: boolean;
  startTime: number;
  deltaTime: number;
  lastFrameTime: number;
  audioQueue: string[];
  overlay: OverlayState;
}

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  isMain: boolean;
}

export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
}

export interface Extension {
    id: string;
    name: string;
    description: string;
    code: string;
    category: 'movement' | 'physics' | 'visuals' | 'logic';
}

export interface ScriptError {
  line: number;
  message: string;
  fileId?: string; // Track which file has error
}

export interface Suggestion {
  label: string;
  detail: string;
  insertText: string;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;