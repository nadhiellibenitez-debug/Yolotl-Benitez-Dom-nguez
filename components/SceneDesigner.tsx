import React, { useState, useRef, useEffect } from 'react';
import { MousePointer, Box, Type, Plus, Lock, Move, Sliders, Zap } from 'lucide-react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../types';
import { RoadScriptInterpreter } from '../services/interpreter';

interface SceneDesignerProps {
  code: string;
  onChange: (code: string) => void;
}

export default function SceneDesigner({ code, onChange }: SceneDesignerProps) {
  const [selectedTool, setSelectedTool] = useState<'select' | 'entity' | 'ui' | 'slider'>('select');
  const [previewEntities, setPreviewEntities] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Parse code to get current initial state (visualizing what's already there)
  useEffect(() => {
    const interpreter = new RoadScriptInterpreter();
    try {
        interpreter.execute(code); // Run one pass to get initial state
        setPreviewEntities(interpreter.gameState.entities);
    } catch (e) {
        // Code might be incomplete
    }
  }, [code]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) * (CANVAS_WIDTH / rect.width));
      const y = Math.round((e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height));

      if (selectedTool === 'entity') {
          const tag = `ent_${Math.floor(Math.random() * 1000)}`;
          const newCode = `\n# New Entity\n{${tag}, false, #a855f7}\nset(${tag})(x)(${x})\nset(${tag})(y)(${y})\n`;
          onChange(code + newCode);
          setSelectedTool('select');
      } else if (selectedTool === 'ui') {
          const tag = `txt_${Math.floor(Math.random() * 1000)}`;
          const newCode = `\n# New UI Text\nUIconst(${tag}, "Label", false)\n(${tag})(color #ffffff)\n`;
          // We can't easily set UI position in current syntax without a complex parser, 
          // but we can append it. For now, UI positioning is auto-layout in interpreter 
          // unless we add specific position commands.
          onChange(code + newCode);
          setSelectedTool('select');
      }
  };

  const addBehavior = (type: string) => {
      if (!selectedId) return;
      // Find the tag of the selected entity
      const ent = previewEntities.find(e => e.id === selectedId);
      if (!ent) return;

      let snippet = "";
      if (type === 'gravity') {
          snippet = `\nPEBLOCK(${ent.tag}) then {vy = vy + 0.5}\nif (${ent.tag})(y) > 500 then {vy=0}\n`;
      } else if (type === 'bounce') {
          snippet = `\nPEBLOCK(${ent.tag}) then {x = x + 2}\nif (${ent.tag})(x) > 800 then set(${ent.tag})(x)(0)\n`;
      } else if (type === 'control') {
          snippet = `\nif isbuttonpressed(ArrowRight) then set(${ent.tag})(x)((${ent.tag})(x) + 5)\nif isbuttonpressed(ArrowLeft) then set(${ent.tag})(x)((${ent.tag})(x) - 5)\n`;
      }

      // Insert into loop if possible
      const loopStart = code.indexOf('forever = {');
      const loopEnd = code.lastIndexOf('}');
      if (loopStart !== -1 && loopEnd !== -1) {
          const before = code.substring(0, loopEnd);
          const after = code.substring(loopEnd);
          onChange(before + "  " + snippet + after);
      } else {
          onChange(code + "\nforever = {\n" + snippet + "\n}");
      }
  };

  return (
    <div className="flex h-full bg-[#111]">
      {/* Toolbar */}
      <div className="w-16 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-4 gap-4">
          <button 
            onClick={() => setSelectedTool('select')}
            className={`p-3 rounded-lg transition-all ${selectedTool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-800'}`}
            title="Select"
          >
              <MousePointer className="w-5 h-5" />
          </button>
          <div className="w-8 h-px bg-neutral-800" />
          <button 
            onClick={() => setSelectedTool('entity')}
            className={`p-3 rounded-lg transition-all ${selectedTool === 'entity' ? 'bg-purple-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-800'}`}
            title="Place Entity"
          >
              <Box className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setSelectedTool('ui')}
            className={`p-3 rounded-lg transition-all ${selectedTool === 'ui' ? 'bg-green-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-800'}`}
            title="Place Text"
          >
              <Type className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setSelectedTool('slider')}
            className={`p-3 rounded-lg transition-all ${selectedTool === 'slider' ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-500 hover:bg-neutral-800'}`}
            title="Place Slider"
          >
              <Sliders className="w-5 h-5" />
          </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/blueprint.png')] bg-[#0d0d0d] relative overflow-hidden flex items-center justify-center">
          <div 
             className="relative bg-black border-2 border-dashed border-neutral-700 shadow-2xl"
             style={{ width: CANVAS_WIDTH * 0.8, height: CANVAS_HEIGHT * 0.8 }}
             onClick={handleCanvasClick}
          >
             <div className="absolute top-2 left-2 text-xs font-mono text-neutral-500 pointer-events-none">
                 SCENE PREVIEW (READ-ONLY)
             </div>

             {previewEntities.map(ent => (
                 <div
                    key={ent.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(ent.id); setSelectedTool('select'); }}
                    className={`absolute border-2 transition-all cursor-pointer hover:border-white ${selectedId === ent.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-transparent'}`}
                    style={{
                        left: (ent.pos.x / CANVAS_WIDTH) * 100 + '%',
                        top: (ent.pos.y / CANVAS_HEIGHT) * 100 + '%',
                        width: (ent.size.width / CANVAS_WIDTH) * 100 + '%',
                        height: (ent.size.height / CANVAS_HEIGHT) * 100 + '%',
                        backgroundColor: ent.color
                    }}
                 >
                     {ent.renderType === 'text' && <span className="flex items-center justify-center w-full h-full text-white text-xs">{ent.renderContent}</span>}
                 </div>
             ))}

             {selectedTool !== 'select' && (
                 <div className="absolute inset-0 bg-black/10 cursor-crosshair flex items-center justify-center">
                     <span className="bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur">
                         Click to place {selectedTool.toUpperCase()}
                     </span>
                 </div>
             )}
          </div>
      </div>

      {/* Properties Panel */}
      <div className="w-64 bg-neutral-900 border-l border-neutral-800 p-4">
          <h3 className="text-xs font-bold text-neutral-500 uppercase mb-4">Properties</h3>
          
          {selectedId ? (
              <div className="flex flex-col gap-4">
                  <div className="p-3 bg-neutral-800 rounded border border-neutral-700">
                      <div className="text-xs text-neutral-400 mb-1">Selected Entity</div>
                      <div className="font-mono font-bold text-indigo-400">
                          {previewEntities.find(e => e.id === selectedId)?.tag || 'Unknown'}
                      </div>
                  </div>

                  <div>
                      <h4 className="text-xs font-bold text-neutral-400 mb-2 flex items-center gap-2">
                          <Zap className="w-3 h-3" /> PE-BLOCKS (Behaviors)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => addBehavior('gravity')} className="bg-neutral-800 hover:bg-neutral-700 text-xs p-2 rounded border border-neutral-700 text-left">
                              Gravity
                          </button>
                          <button onClick={() => addBehavior('control')} className="bg-neutral-800 hover:bg-neutral-700 text-xs p-2 rounded border border-neutral-700 text-left">
                              Arrow Ctrl
                          </button>
                          <button onClick={() => addBehavior('bounce')} className="bg-neutral-800 hover:bg-neutral-700 text-xs p-2 rounded border border-neutral-700 text-left">
                              Auto Bounce
                          </button>
                      </div>
                  </div>
                  
                  <div className="text-[10px] text-neutral-500 mt-4">
                      * Behaviors are appended to the main loop code.
                  </div>
              </div>
          ) : (
              <div className="text-neutral-600 text-sm text-center mt-10 italic">
                  Select an entity to add behaviors or properties.
              </div>
          )}
      </div>
    </div>
  );
}