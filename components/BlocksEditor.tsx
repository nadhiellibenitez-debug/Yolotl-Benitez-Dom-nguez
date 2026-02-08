import React from 'react';
import { Plus, Trash2, GripVertical, Play, Box, Type, Eye, AlertTriangle } from 'lucide-react';

interface BlocksEditorProps {
  code: string;
  onChange: (code: string) => void;
}

const BLOCK_TYPES = [
  { label: 'Movement', color: 'bg-blue-600', border: 'border-blue-500', icon: <Play className="w-3 h-3" />, template: 'player.move(0, 0)' },
  { label: 'Set Property', color: 'bg-indigo-600', border: 'border-indigo-500', icon: <Box className="w-3 h-3" />, template: 'set(player)(x)(0)' },
  { label: 'Variable', color: 'bg-orange-600', border: 'border-orange-500', icon: <Type className="w-3 h-3" />, template: 'var(name, 0)' },
  { label: 'Condition', color: 'bg-yellow-600', border: 'border-yellow-500', icon: <AlertTriangle className="w-3 h-3" />, template: 'if isbuttonpressed(Space) then ...' },
  { label: 'Visuals', color: 'bg-pink-600', border: 'border-pink-500', icon: <Eye className="w-3 h-3" />, template: 'setsprite(emoji)(👻)(player)' },
  { label: 'Background', color: 'bg-emerald-600', border: 'border-emerald-500', icon: <Play className="w-3 h-3" />, template: 'roadweight.move(5)' },
  { label: 'Spawn', color: 'bg-red-600', border: 'border-red-500', icon: <Box className="w-3 h-3" />, template: 'spawn(obstacle)' },
];

export default function BlocksEditor({ code, onChange }: BlocksEditorProps) {
  const lines = code.split('\n');

  const updateLine = (index: number, newVal: string) => {
    const newLines = [...lines];
    newLines[index] = newVal;
    onChange(newLines.join('\n'));
  };

  const removeLine = (index: number) => {
    const newLines = lines.filter((_, i) => i !== index);
    onChange(newLines.join('\n'));
  };

  const addBlock = (template: string) => {
    // Insert inside loop if possible, else at end
    const loopStart = lines.findIndex(l => l.includes('forever = {'));
    const loopEnd = lines.lastIndexOf('}');
    
    let newLines = [...lines];
    if (loopStart !== -1 && loopEnd !== -1) {
        newLines.splice(loopEnd, 0, '  ' + template);
    } else {
        newLines.push(template);
    }
    onChange(newLines.join('\n'));
  };

  const getBlockStyle = (line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('var')) return BLOCK_TYPES[2];
    if (trimmed.startsWith('if')) return BLOCK_TYPES[3];
    if (trimmed.startsWith('set')) return BLOCK_TYPES[1];
    if (trimmed.startsWith('setsprite') || trimmed.startsWith('UI')) return BLOCK_TYPES[4];
    if (trimmed.startsWith('roadweight')) return BLOCK_TYPES[5];
    if (trimmed.startsWith('spawn')) return BLOCK_TYPES[6];
    if (trimmed.startsWith('forever') || trimmed === '}') return { label: 'Loop', color: 'bg-neutral-700', border: 'border-neutral-600', icon: null, template: '' };
    if (trimmed.startsWith('#') || trimmed === '') return null; // Comments/Empty
    return { label: 'Command', color: 'bg-slate-700', border: 'border-slate-600', icon: null, template: '' };
  };

  return (
    <div className="flex h-full bg-[#111]">
      {/* Sidebar Palette */}
      <div className="w-48 bg-neutral-900 border-r border-neutral-800 p-4 flex flex-col gap-2 overflow-y-auto">
        <h3 className="text-xs font-bold text-neutral-500 uppercase mb-2">Block Palette</h3>
        {BLOCK_TYPES.map((type, i) => (
          <button
            key={i}
            onClick={() => addBlock(type.template)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium text-white rounded shadow-sm border ${type.color} ${type.border} hover:opacity-90 transition-transform active:scale-95 text-left`}
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {/* Main Block Area */}
      <div className="flex-1 p-8 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')]">
        <div className="flex flex-col gap-1 max-w-2xl">
          {lines.map((line, i) => {
            const style = getBlockStyle(line);
            
            // Render basic text inputs for unknown lines or comments (simplified)
            if (!style) {
                 if (line.trim() === '') return <div key={i} className="h-4"></div>;
                 return (
                    <div key={i} className="flex items-center gap-2 opacity-50 ml-4">
                        <span className="text-neutral-600 font-mono text-xs">#</span>
                        <input 
                            value={line}
                            onChange={(e) => updateLine(i, e.target.value)}
                            className="bg-transparent text-neutral-500 font-mono text-xs w-full focus:outline-none"
                        />
                    </div>
                 )
            }

            // Indentation logic for visual nesting
            const isInsideLoop = i > lines.findIndex(l => l.includes('forever')) && i < lines.lastIndexOf('}');
            const indentClass = isInsideLoop ? 'ml-8' : '';

            return (
              <div key={i} className={`group relative flex items-center ${indentClass}`}>
                <div className={`flex-1 flex items-center gap-2 p-2 rounded-md border text-white shadow-md ${style.color} ${style.border}`}>
                   <GripVertical className="w-4 h-4 text-white/50 cursor-move" />
                   <span className="text-xs font-bold opacity-70 uppercase tracking-wider">{style.label}</span>
                   <div className="h-4 w-px bg-white/20 mx-1"></div>
                   <input 
                     value={line.trim()} 
                     onChange={(e) => updateLine(i, isInsideLoop ? '  ' + e.target.value : e.target.value)}
                     className="bg-black/20 rounded px-2 py-1 font-mono text-sm w-full text-white focus:outline-none focus:bg-black/40 transition-colors"
                   />
                </div>
                <button 
                    onClick={() => removeLine(i)}
                    className="absolute -right-8 p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                
                {/* Connector Line for Loop visual */}
                {style.label === 'Loop' && line.includes('forever') && (
                    <div className="absolute left-4 top-full h-full w-0.5 bg-neutral-600 -z-10 h-[500px]"></div>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-32"></div>
      </div>
    </div>
  );
}