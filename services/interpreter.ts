import { GameState, Entity, ScriptError, CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';
import { synth } from './audioService';

// Helper to calculate distance
const getDistance = (e1: Entity, e2: Entity): number => {
    const dx = e1.pos.x - e2.pos.x;
    const dy = e1.pos.y - e2.pos.y;
    return Math.sqrt(dx * dx + dy * dy);
}

const evaluateExpression = (expr: string, gameState: GameState): number | string | boolean => {
  if (!expr) return 0;
  expr = expr.trim();

  // Math Functions
  if (expr.startsWith('math.')) {
      let match = expr.match(/math\.(sen|cs|atan|absolute|sqrt)\((.+)\)/);
      if (match) {
          const op = match[1];
          const val = Number(evaluateExpression(match[2], gameState));
          if (op === 'sen') return Math.sin(val);
          if (op === 'cs') return Math.cos(val);
          if (op === 'atan') return Math.atan(val);
          if (op === 'absolute') return Math.abs(val);
          if (op === 'sqrt') return Math.sqrt(val);
      }
      match = expr.match(/math\.(sum|rest|multiplication|division)\((.+)\)\((.+)\)/);
      if (match) {
          const op = match[1];
          const a = Number(evaluateExpression(match[2], gameState));
          const b = Number(evaluateExpression(match[3], gameState));
          if (op === 'sum') return a + b;
          if (op === 'rest') return a - b;
          if (op === 'multiplication') return a * b;
          if (op === 'division') return b !== 0 ? a / b : 0;
      }
  }
  
  // Getter Syntax
  const getterRegex = /\(([a-zA-Z0-9_]+)\)\(([a-zA-Z0-9_]+)\)/g;
  expr = expr.replace(getterRegex, (match, tag, prop) => {
     if (tag === 'global') {
         if (prop === 'deltatime') return String(gameState.deltaTime);
         if (prop === 'time') return String(gameState.vars['time'] || 0);
         return '0';
     }

     const entity = gameState.entities.find(e => e.tag === tag);
     if (entity) {
        switch(prop) {
            case 'x': return String(entity.pos.x);
            case 'y': return String(entity.pos.y);
            case 'w': case 'width': return String(entity.size.width);
            case 'h': case 'height': return String(entity.size.height);
            case 'size': return String(entity.size.width);
            case 'rotation': return String(entity.rotation || 0);
            case 'active': return String(entity.active);
        }
     }

     const ui = gameState.ui[tag];
     if (ui) {
         if (prop === 'value') return String(ui.value);
     }

     return '0';
  });

  // Array Look
  if (expr.startsWith('look(')) {
      const match = expr.match(/look\(([^,]+),\s*(.+)\)/);
      if (match) {
          const listName = match[1].trim();
          const idx = Number(evaluateExpression(match[2], gameState));
          const arr = gameState.arrays[listName];
          if (arr && arr[idx] !== undefined) return arr[idx];
          return 0;
      }
  }

  // Random
  if (expr.startsWith('randim(')) {
    const match = expr.match(/randim\((-?\d+)\*(-?\d+)\)/);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  if (!isNaN(Number(expr))) return Number(expr);
  if (expr.startsWith('"') && expr.endsWith('"')) return expr.slice(1, -1);
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (gameState.vars[expr] !== undefined) return gameState.vars[expr];

  // Logic
  if (expr.includes('>')) return (Number(evaluateExpression(expr.split('>')[0], gameState)) || 0) > (Number(evaluateExpression(expr.split('>')[1], gameState)) || 0);
  if (expr.includes('<')) return (Number(evaluateExpression(expr.split('<')[0], gameState)) || 0) < (Number(evaluateExpression(expr.split('<')[1], gameState)) || 0);
  if (expr.includes('+')) return expr.split('+').reduce((acc, part) => acc + (Number(evaluateExpression(part, gameState)) || 0), 0);
  if (expr.includes('-') && !expr.startsWith('-')) return (Number(evaluateExpression(expr.split('-')[0], gameState)) || 0) - (Number(evaluateExpression(expr.split('-')[1], gameState)) || 0);
  if (expr.includes('/')) return (Number(evaluateExpression(expr.split('/')[0], gameState)) || 0) / (Number(evaluateExpression(expr.split('/')[1], gameState)) || 1);
  
  return 0; 
};

export class RoadScriptInterpreter {
  gameState: GameState;
  pressedKeys: Set<string>;
  fullCodeLines: string[]; 

  constructor() {
    this.gameState = {
      vars: {},
      arrays: {},
      entities: [
        {
          id: 'player',
          tag: 'player',
          pos: { x: CANVAS_WIDTH / 2 - 25, y: CANVAS_HEIGHT - 100 },
          size: { width: 50, height: 80 },
          color: '#3b82f6', 
          velocity: { x: 0, y: 0 },
          rotation: 0,
          active: true,
          hidden: false,
          renderType: 'rect'
        }
      ],
      particles: [],
      ui: {},
      bgOffset: 0,
      gameOver: false,
      stopped: false,
      resetRequested: false,
      startTime: Date.now(),
      deltaTime: 0,
      lastFrameTime: Date.now(),
      audioQueue: [],
      overlay: { active: false, content: '', type: 'text' }
    };
    this.pressedKeys = new Set();
    this.fullCodeLines = [];
  }

  static validateScript(code: string): ScriptError[] {
    const errors: ScriptError[] = [];
    const lines = code.split('\n');
    let insideBlock = false;
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      if (trimmed === 'forever = {') insideBlock = true;
      if (trimmed === '}') insideBlock = false;
    });
    return errors;
  }

  setInputs(keys: Set<string>) {
    this.pressedKeys = keys;
  }

  execute(code: string) {
    if (this.gameState.gameOver || this.gameState.stopped) return;

    const now = Date.now();
    this.gameState.deltaTime = now - this.gameState.lastFrameTime;
    this.gameState.lastFrameTime = now;
    this.gameState.vars['time'] = now - this.gameState.startTime;
    this.gameState.vars['deltatime'] = this.gameState.deltaTime;

    this.fullCodeLines = code.split('\n');
    let insideForever = false;

    for (const line of this.fullCodeLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed === 'forever = {') { insideForever = true; continue; }
      if (trimmed === '}') { insideForever = false; continue; }

      const hasForever = code.includes('forever = {');
      const isInit = this.gameState.vars['__initialized__'];

      if (hasForever) {
          if (!isInit && !insideForever) {
              this.processLine(trimmed);
          } else if (isInit && insideForever) {
              this.processLine(trimmed);
          }
      } else {
          this.processLine(trimmed);
      }
    }
    
    if (!this.gameState.vars['__initialized__']) {
        this.gameState.vars['__initialized__'] = true;
    }
    this.runPhysics();
  }

  runPhysics() {
    // Entities
    this.gameState.entities.forEach(ent => {
       ent.pos.x += ent.velocity.x;
       ent.pos.y += ent.velocity.y;
       if (ent.pos.y > CANVAS_HEIGHT + 200 || ent.pos.y < -300) {
         if (ent.tag !== 'player') ent.active = false;
       }
    });
    this.gameState.entities = this.gameState.entities.filter(e => e.active);

    // Particles (Notefyshics)
    this.gameState.particles.forEach(p => {
        p.pos.x += p.velocity.x;
        p.pos.y += p.velocity.y;
        p.life -= 0.02; // Fade out
    });
    this.gameState.particles = this.gameState.particles.filter(p => p.life > 0);
  }

  processLine(line: string, contextEntity?: Entity) {
    if (line === 'reset') { this.gameState.resetRequested = true; return; }
    if (line === 'stop') { this.gameState.stopped = true; return; }

    // notefyshics(Note or Text)
    // Supports musical notes: notefyshics(C4), notefyshics(A#5)
    let match = line.match(/^notefyshics\((.+)\)/);
    if (match) {
        const content = match[1].trim();
        const isNote = /^[a-gA-G]#?\d$/.test(content);
        
        if (isNote) {
           synth.playNote(content);
           // Also spawn a small visual note
           this.gameState.particles.push({
                id: Math.random().toString(),
                text: "♪ " + content,
                pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
                velocity: { x: (Math.random() - 0.5) * 4, y: -4 },
                life: 1.0,
                color: '#60a5fa',
                size: 20
            });
        } else {
            // Legacy text particle
            this.gameState.particles.push({
                id: Math.random().toString(),
                text: content,
                pos: { x: CANVAS_WIDTH / 2 + (Math.random() * 100 - 50), y: CANVAS_HEIGHT / 2 },
                velocity: { x: (Math.random() - 0.5) * 2, y: -3 },
                life: 1.0,
                color: '#fbbf24',
                size: 24
            });
        }
        return;
    }

    // reproduceanim.media(tag)(url)
    match = line.match(/^reproduceanim\.media\(([^)]+)\)\((.+)\)/);
    if (match) {
        const tag = match[1].trim();
        const url = match[2].trim();
        const entities = this.gameState.entities.filter(e => e.tag === tag);
        entities.forEach(e => {
            e.renderType = 'anim';
            e.renderContent = url;
        });
        return;
    }

    // setsprite(type)(content)(tag)
    match = line.match(/^setsprite\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)/);
    if (match) {
        const type = match[1].trim() as any;
        const content = match[2].trim();
        const tag = match[3].trim();
        const entities = this.gameState.entities.filter(e => e.tag === tag);
        entities.forEach(e => {
            if (['text', 'emoji', 'image', 'rect'].includes(type)) {
                e.renderType = type;
                e.renderContent = content;
            }
        });
        return;
    }

    // Standard variable
    match = line.match(/^var\(([^,]+),\s*(.+)\)/);
    if (match) {
      this.gameState.vars[match[1].trim()] = evaluateExpression(match[2].trim(), this.gameState);
      return;
    }

    // Standard set
    match = line.match(/^set\(([^)]+)\)\(([^)]+)\)\((.+)\)/);
    if (match) {
        const tag = match[1].trim();
        const prop = match[2].trim();
        const val = Number(evaluateExpression(match[3].trim(), this.gameState));
        this.gameState.entities.filter(e => e.tag === tag).forEach(e => {
            if (prop === 'x') e.pos.x = val;
            if (prop === 'y') e.pos.y = val;
            if (prop === 'rotation') e.rotation = val;
        });
        return;
    }

    // Standard logic
    match = line.match(/^if\s+(.+)\s+then\s+(.+)/);
    if (match) {
      if (this.evaluateCondition(match[1].trim())) {
          let action = match[2].trim();
          if (action.startsWith('{') && action.endsWith('}')) {
              action = action.slice(1, -1).trim();
              action.split('\n').forEach(sl => this.processLine(sl, contextEntity));
          } else {
              this.processLine(action, contextEntity);
          }
      }
      return;
    }

    // UI
    match = line.match(/^UIconst\(([^,]+),\s*([^,]+),\s*(.+)\)/);
    if (match) {
      const tag = match[1].trim();
      const val = evaluateExpression(match[2].trim(), this.gameState);
      if (!this.gameState.ui[tag]) {
        this.gameState.ui[tag] = { tag, type: 'text', value: val, hidden: false, position: { x: 20, y: 40 + Object.keys(this.gameState.ui).length * 40 }, color: '#fff' };
      } else {
        this.gameState.ui[tag].value = val;
      }
      return;
    }

    // UI Slider
    match = line.match(/^UIslider\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)\(([^)]+)\)/);
    if (match) {
        const tag = match[1].trim();
        const val = Number(evaluateExpression(match[4], this.gameState));
        if (!this.gameState.ui[tag]) {
            this.gameState.ui[tag] = { tag, type: 'slider', value: val, min: Number(match[2]), max: Number(match[3]), hidden: false, position: { x: 20, y: 40 + Object.keys(this.gameState.ui).length * 40 } };
        }
        return;
    }
    
    // spawn
    match = line.match(/^spawn\((.+)\)/);
    if (match) {
      if (match[1].trim() === 'obstacle') {
        this.gameState.entities.push({
            id: Math.random().toString(),
            tag: 'obstacle',
            pos: { x: Math.random() * (CANVAS_WIDTH - 60), y: -100 },
            size: { width: 60, height: 60 },
            color: '#ef4444', 
            velocity: { x: 0, y: 0 },
            rotation: 0,
            active: true,
            renderType: 'rect'
        });
      }
      return;
    }

    // PEBLOCK
    match = line.match(/^PEBLOCK\((.+)\)\s*then\s*(.+)/);
    if (match) {
        const tag = match[1].trim();
        const cmd = match[2].trim();
        this.gameState.entities.filter(e => e.tag === tag).forEach(e => this.processLine(cmd, e));
        return;
    }

    // Velocity {vx,vy}
    match = line.match(/^\{vx=(.+),\s*vy=(.+)\}/);
    if (match) {
      if (contextEntity) {
        contextEntity.velocity.x = Number(evaluateExpression(match[1], this.gameState));
        contextEntity.velocity.y = Number(evaluateExpression(match[2], this.gameState));
      }
      return;
    }

    // Init {tag...}
    match = line.match(/^\{([^,]+),\s*(true|false),\s*([^}]+)\}/);
    if (match) {
      const tag = match[1].trim();
      const color = match[3].trim();
      if (!this.gameState.entities.find(e => e.tag === tag)) {
        this.gameState.entities.push({
          id: Math.random().toString(),
          tag,
          pos: { x: 400, y: 300 },
          size: { width: 40, height: 40 },
          color,
          velocity: { x: 0, y: 0 },
          active: true,
          renderType: 'rect'
        });
      }
      return;
    }

    // BG
    match = line.match(/^roadweight\.move\((.+)\)/);
    if (match) {
        this.gameState.bgOffset = (this.gameState.bgOffset + Number(evaluateExpression(match[1], this.gameState))) % CANVAS_HEIGHT;
        return;
    }

    // Tele
    match = line.match(/^tele\(([^,]+),\s*(.+),\s*(.+)\)/);
    if (match) {
        const tag = match[1].trim();
        const x = Number(evaluateExpression(match[2], this.gameState));
        const y = Number(evaluateExpression(match[3], this.gameState));
        this.gameState.entities.filter(e => e.tag === tag).forEach(e => { e.pos.x = x; e.pos.y = y; });
        return;
    }
    
    // Extense
    match = line.match(/^extense\(([^)]+)\)(\(([^)]+)\))?/);
    if (match) {
        const tag = match[1].trim();
        const pad = match[3] ? Number(evaluateExpression(match[3], this.gameState)) : 0;
        this.gameState.entities.filter(e => e.tag === tag).forEach(e => {
            e.pos.x = Math.max(pad, Math.min(CANVAS_WIDTH - e.size.width - pad, e.pos.x));
            e.pos.y = Math.max(pad, Math.min(CANVAS_HEIGHT - e.size.height - pad, e.pos.y));
        });
        return;
    }

    // Sound
    match = line.match(/^reproduce\((.+)\)/);
    if (match) {
        this.gameState.audioQueue.push(match[1].trim());
        return;
    }

    // Overlay
    match = line.match(/^printingfuncion\((.+)\)/);
    if (match) {
        const c = match[1].trim();
        if (!c || c === 'none') this.gameState.overlay.active = false;
        else {
            this.gameState.overlay = { active: true, content: c, type: c.match(/\.(mp4|webm)$/)? 'video' : c.match(/\.(png|jpg)$/)? 'image' : 'text' };
        }
        return;
    }

    // Touch
    match = line.match(/^\((.+)\)\(color\s+(.+)\)/);
    if(match) {
        const t = match[1].trim();
        const c = match[2].trim();
        if(this.gameState.ui[t]) this.gameState.ui[t].color = c;
    }
  }

  evaluateCondition(cond: string): boolean {
    if (cond.includes('isbuttonpressed')) {
        const match = cond.match(/isbuttonpressed\((.+)\)/);
        if (match) return this.pressedKeys.has(match[1].trim());
    }
    if (cond.includes('touch')) {
        const match = cond.match(/^\((.+)\)\s+touch\s+\((.+)\)/);
        if (match) return this.checkCollision(match[1].trim(), match[2].trim());
    }
    if (cond.includes('>')) return (Number(evaluateExpression(cond.split('>')[0], this.gameState)) || 0) > (Number(evaluateExpression(cond.split('>')[1], this.gameState)) || 0);
    return false;
  }

  checkCollision(tag1: string, tag2: string): boolean {
    const ents1 = this.gameState.entities.filter(e => e.tag === tag1 && !e.hidden);
    const ents2 = this.gameState.entities.filter(e => e.tag === tag2 && !e.hidden);
    for (const e1 of ents1) {
      for (const e2 of ents2) {
        if (e1.id === e2.id) continue;
        if (
          e1.pos.x < e2.pos.x + e2.size.width &&
          e1.pos.x + e1.size.width > e2.pos.x &&
          e1.pos.y < e2.pos.y + e2.size.height &&
          e1.pos.y + e1.size.height > e2.pos.y
        ) return true;
      }
    }
    return false;
  }
}