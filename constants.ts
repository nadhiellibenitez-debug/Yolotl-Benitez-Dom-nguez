import { Suggestion, ProjectFile, Extension } from "./types";

export const COMMAND_LIST: Suggestion[] = [
  { label: 'var', detail: 'Define a variable', insertText: 'var(name, value)' },
  { label: 'set', detail: 'Set entity property', insertText: 'set(tag)(property)(value)' },
  { label: 'UIconst', detail: 'Create UI Text', insertText: 'UIconst(tag, "Text", false)' },
  { label: 'UIslider', detail: 'Create Slider', insertText: 'UIslider(tag)(min)(max)(default)' },
  { label: 'roadweight.move', detail: 'Scroll background', insertText: 'roadweight.move(speed)' },
  { label: 'if', detail: 'Conditional logic', insertText: 'if condition then action' },
  { label: 'isbuttonpressed', detail: 'Check input', insertText: 'isbuttonpressed(Key)' },
  { label: 'spawn', detail: 'Spawn entity', insertText: 'spawn(tag)' },
  { label: 'PEBLOCK', detail: 'Physics/Logic Block', insertText: 'PEBLOCK(tag) then action' },
  { label: 'player.move', detail: 'Move player directly', insertText: 'player.move(x, y)' },
  { label: 'forever', detail: 'Loop block', insertText: 'forever = {\n  \n}' },
  { label: 'event', detail: 'Define custom event', insertText: 'event(name) then action' },
  { label: 'active', detail: 'Trigger event', insertText: 'active(name).event' },
  { label: 'export', detail: 'End game/Redirect', insertText: 'export(GAMEOVER)' },
  { label: 'randim', detail: 'Random number', insertText: 'randim(min*max)' },
  { label: 'touch', detail: 'Collision check', insertText: '(tag) touch (tag)' },
  { label: 'reset', detail: 'Restart game', insertText: 'reset' },
  { label: 'stop', detail: 'Pause game', insertText: 'stop' },
  { label: 'tele', detail: 'Teleport entity', insertText: 'tele(tag, x, y)' },
  { label: 'extense', detail: 'Clamp to screen', insertText: 'extense(tag)' },
  { label: 'ifdys', detail: 'Check distance', insertText: 'ifdys(tag1)(tag2) < 100 then' },
  { label: 'math.sum', detail: 'Add values', insertText: 'math.sum(a)(b)' },
  { label: 'math.sen', detail: 'Sine wave', insertText: 'math.sen(time)' },
  { label: 'unlost', detail: 'Save/Load game', insertText: 'unlost(save)' },
  { label: 'array', detail: 'Replace item', insertText: 'array_replace(list, index, val)' },
  { label: 'setsprite', detail: 'Set visual style', insertText: 'setsprite(emoji)(👻)(tag)' },
  { label: 'reproduce', detail: 'Play sound', insertText: 'reproduce(https://...)' },
  { label: 'printingfuncion', detail: 'Overlay media', insertText: 'printingfuncion(Hello World)' },
  { label: 'notefyshics', detail: 'Play musical note', insertText: 'notefyshics(C4)' },
  { label: 'reproduceanim.media', detail: 'Animated Sprite', insertText: 'reproduceanim.media(tag)(URL)' },
  { label: 'run_script', detail: 'Include another file', insertText: 'run_script(FILENAME.rw)' },
];

export const DEFAULT_FILES: ProjectFile[] = [
    {
        id: 'init',
        name: 'INIT.rw',
        isMain: false,
        content: `# INITIALIZATION
var(score, 0)
var(speed, 5)

# Setup Player
{player, false, #3b82f6}
set(player)(x)(400)
set(player)(y)(500)
setsprite(emoji)(🚗)(player)

# UI
UIconst(scoreLabel, "SCORE: 0", false)
(scoreLabel)(color #4ade80)
`
    },
    {
        id: 'movement',
        name: 'MOVEMENT.rw',
        isMain: false,
        content: `# MOVEMENT LOGIC
if isbuttonpressed(ArrowLeft) then set(player)(x)((player)(x) - 5)
if isbuttonpressed(ArrowRight) then set(player)(x)((player)(x) + 5)
if isbuttonpressed(ArrowUp) then set(player)(y)((player)(y) - 5)
if isbuttonpressed(ArrowDown) then set(player)(y)((player)(y) + 5)

extense(player)(10)
`
    },
    {
        id: 'main',
        name: 'MAIN.rw',
        isMain: true,
        content: `# Main Script
run_script(INIT.rw)

forever = {
  roadweight.move(speed)
  
  # Run Movement Script (Injection)
  run_script(MOVEMENT.rw)
  
  # Spawn Obstacles
  var(chance, randim(0*100))
  if chance > 98 then {
     spawn(obstacle)
     notefyshics(C4) 
  }
  
  PEBLOCK(obstacle) then {vx=0, vy=speed}
  setsprite(emoji)(🚧)(obstacle)

  # Check Collision
  if (player) touch (obstacle) then {
     notefyshics(A2)
     printingfuncion(GAME OVER)
     stop
  }
  
  # Score
  var(score, math.sum(score)(1))
  UIconst(scoreLabel, score, false)
}`
    }
];

export const EXTENSIONS_LIST: Extension[] = [
    {
        id: 'gravity',
        name: 'Simple Gravity',
        description: 'Applies gravity to the player entity.',
        category: 'physics',
        code: `
# GRAVITY EXTENSION
var(gravity, 0.5)
var(jumpForce, 10)
var(groundY, 500)

PEBLOCK(player) then {vy = vy + gravity}

if isbuttonpressed(Space) then {
   if (player)(y) > groundY - 5 then {vy = -jumpForce}
}

if (player)(y) > groundY then {
    set(player)(y)(groundY)
    {vy=0, vx=0}
}
`
    },
    {
        id: 'shooter',
        name: 'Space Shooter',
        description: 'Adds shooting mechanics with Spacebar.',
        category: 'movement',
        code: `
# SHOOTER EXTENSION
if isbuttonpressed(Space) then {
    spawn(bullet)
    tele(bullet, (player)(x), (player)(y))
    notefyshics(F#5)
}

PEBLOCK(bullet) then {vy = -10}
setsprite(emoji)(🔥)(bullet)

if (bullet) touch (obstacle) then {
    tele(obstacle, -999, -999)
    tele(bullet, -999, -999)
    notefyshics(C6)
}
`
    },
    {
        id: 'rpg_move',
        name: 'RPG Top-Down',
        description: '8-directional movement.',
        category: 'movement',
        code: `
# RPG MOVEMENT
var(spd, 4)
if isbuttonpressed(w) then set(player)(y)((player)(y) - spd)
if isbuttonpressed(s) then set(player)(y)((player)(y) + spd)
if isbuttonpressed(a) then set(player)(x)((player)(x) - spd)
if isbuttonpressed(d) then set(player)(x)((player)(x) + spd)
`
    }
];

export const AI_SYSTEM_PROMPT = `
You are "RoadAI", an expert engine coder for the RoadWeight Studio.
You must output ONLY valid RoadScript code.
DO NOT write JavaScript, Python, or pseudocode.
DO NOT use 'let', 'const', 'function', 'return', 'class'.

### ROADSCRIPT SYNTAX RULES (STRICT):

1. **Variables**:
   - CORRECT: \`var(myScore, 0)\`
   - INCORRECT: \`var myScore = 0\`

2. **Entity Initialization**:
   - CORRECT: \`{myEntity, false, #ff0000}\`
   - INCORRECT: \`new Entity('myEntity')\`

3. **Setting Properties**:
   - CORRECT: \`set(myEntity)(x)(100)\`
   - INCORRECT: \`myEntity.x = 100\`

4. **Conditionals**:
   - CORRECT: \`if (player)(x) > 500 then set(player)(x)(0)\`
   - CORRECT: \`if isbuttonpressed(Space) then ...\`
   - Block Syntax:
     \`if condition then {\n  command1\n  command2\n}\`

5. **Loop**:
   - The main game loop MUST be wrapped in:
     \`forever = {\n  ...\n}\`

6. **New Features**:
   - Physics Notification: \`notefyshics(BOOM!)\`
   - Play Note: \`notefyshics(C4)\` or \`notefyshics(F#5)\`
   - Animated Sprite: \`reproduceanim.media(player)(https://link.to.gif)\`
   - Logic Block for Entity: \`PEBLOCK(player) then {vx=5, vy=0}\`
   - Include Script: \`run_script(SCRIPT_NAME.rw)\`

7. **Math**:
   - \`math.sum(a)(b)\`, \`math.sen(time)\`, \`randim(0*10)\`

### EXAMPLE TASK: "Make a jumping player"

\`\`\`
var(gravity, 0.5)
var(jumpStr, 12)

{player, false, #00ff00}
set(player)(x)(100)
set(player)(y)(400)

forever = {
  # Apply Gravity
  PEBLOCK(player) then {vy = vy + gravity}
  
  # Floor collision
  if (player)(y) > 400 then {
      set(player)(y)(400)
      {vy=0, vx=0}
      if isbuttonpressed(Space) then {
         vy = -jumpStr
         notefyshics(C5)
      }
  }
}
\`\`\`

If the user asks to fix code, return ONLY the corrected code block.
`;