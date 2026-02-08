import React, { useMemo } from 'react';
import { ArrowRight, Box, Repeat, Zap } from 'lucide-react';

interface NodesEditorProps {
  code: string;
  onChange: (code: string) => void;
}

// Simple Parser to convert code to nodes
const parseToNodes = (code: string) => {
    const nodes = [];
    const lines = code.split('\n');
    
    // Global Vars Node
    const vars = lines.filter(l => l.trim().startsWith('var') || l.trim().startsWith('UI') || l.trim().startsWith('setsprite'));
    if (vars.length > 0) {
        nodes.push({ id: 'init', type: 'init', label: 'Initialization', content: vars, x: 50, y: 50 });
    }

    // Loop Node
    const loopStart = lines.findIndex(l => l.includes('forever'));
    if (loopStart !== -1) {
        nodes.push({ id: 'loop', type: 'loop', label: 'Game Loop', content: [], x: 300, y: 50 });
        
        // Extract commands inside loop
        const loopContent = lines.slice(loopStart + 1, lines.lastIndexOf('}'));
        let yOffset = 180;
        
        loopContent.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            
            if (trimmed.startsWith('if')) {
                nodes.push({ id: `cmd-${idx}`, type: 'condition', label: 'Condition', content: [trimmed], x: 350, y: yOffset });
                yOffset += 120;
            } else if (!trimmed.startsWith('}')) {
                 nodes.push({ id: `cmd-${idx}`, type: 'action', label: 'Action', content: [trimmed], x: 350, y: yOffset });
                 yOffset += 100;
            }
        });
    }

    return nodes;
};

export default function NodesEditor({ code, onChange }: NodesEditorProps) {
  const nodes = useMemo(() => parseToNodes(code), [code]);

  const updateNodeLine = (originalLine: string, newLine: string) => {
      // Very basic replacement: find first occurrence of line and replace it
      // In a real node editor, we would map IDs to lines strictly.
      const newCode = code.replace(originalLine, newLine);
      onChange(newCode);
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-auto relative p-10 cursor-grab active:cursor-grabbing">
       {/* Background Grid */}
       <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
            style={{ 
                backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
                backgroundSize: '20px 20px' 
            }}
       ></div>

       <div className="relative z-10 w-[2000px] h-[2000px]">
           {nodes.map((node) => (
               <div 
                 key={node.id}
                 className="absolute w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl flex flex-col"
                 style={{ left: node.x, top: node.y }}
               >
                  {/* Header */}
                  <div className={`p-2 border-b border-neutral-700 flex items-center gap-2 rounded-t-lg
                    ${node.type === 'init' ? 'bg-orange-900/30 text-orange-400' : ''}
                    ${node.type === 'loop' ? 'bg-purple-900/30 text-purple-400' : ''}
                    ${node.type === 'condition' ? 'bg-yellow-900/30 text-yellow-400' : ''}
                    ${node.type === 'action' ? 'bg-blue-900/30 text-blue-400' : ''}
                  `}>
                      {node.type === 'init' && <Box className="w-4 h-4" />}
                      {node.type === 'loop' && <Repeat className="w-4 h-4" />}
                      {node.type === 'condition' && <Zap className="w-4 h-4" />}
                      <span className="font-bold text-sm">{node.label}</span>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex flex-col gap-2">
                      {node.content.map((line, i) => (
                          <input 
                            key={i}
                            value={line}
                            onChange={(e) => updateNodeLine(line, e.target.value)}
                            className="bg-black/40 border border-transparent focus:border-neutral-600 rounded px-2 py-1 text-xs font-mono text-neutral-300 focus:outline-none w-full"
                          />
                      ))}
                      {node.content.length === 0 && <span className="text-xs text-neutral-600 italic">Empty Block</span>}
                  </div>

                  {/* Ports */}
                  <div className="absolute -right-3 top-8 w-6 h-6 bg-neutral-800 border-2 border-neutral-600 rounded-full z-20 hover:scale-110 transition-transform"></div>
                  {node.type !== 'init' && (
                     <div className="absolute -left-3 top-8 w-6 h-6 bg-neutral-800 border-2 border-neutral-600 rounded-full z-20"></div>
                  )}

                  {/* Connector Lines (Visual Fake) */}
                  {node.type === 'init' && (
                      <svg className="absolute left-full top-10 w-48 h-20 pointer-events-none overflow-visible">
                          <path d="M 0 0 C 100 0, 100 0, 240 0" stroke="#555" strokeWidth="2" fill="none" />
                          <polygon points="235,-5 245,0 235,5" fill="#555" />
                      </svg>
                  )}
                  {node.type === 'loop' && (
                      <svg className="absolute left-6 top-full w-10 h-32 pointer-events-none overflow-visible z-[-1]">
                           <line x1="10" y1="0" x2="10" y2="3500" stroke="#333" strokeWidth="4" />
                      </svg>
                  )}
               </div>
           ))}
           
           {/* Connecting Arrows for Loop Items */}
           {nodes.filter(n => n.type !== 'init' && n.type !== 'loop').map((node, i) => (
                <div key={'arrow-'+i} className="absolute text-neutral-700" style={{ left: 320, top: node.y + 15 }}>
                    <ArrowRight className="w-6 h-6" />
                </div>
           ))}
       </div>
    </div>
  );
}