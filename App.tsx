import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Code2, Gamepad2, Sparkles, Terminal, Layers, Network, PenTool } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import BlocksEditor from './components/BlocksEditor';
import NodesEditor from './components/NodesEditor';
import SceneDesigner from './components/SceneDesigner';
import GameCanvas from './components/GameCanvas';
import AIAssistant from './components/AIAssistant';
import FileSidebar from './components/FileSidebar';
import { DEFAULT_FILES } from './constants';
import { GameState, ScriptError, ProjectFile, Asset } from './types';
import { RoadScriptInterpreter } from './services/interpreter';

type ViewMode = 'code' | 'blocks' | 'nodes' | 'designer';

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('main');
  const [assets, setAssets] = useState<Asset[]>([]);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [syntaxErrors, setSyntaxErrors] = useState<ScriptError[]>([]);
  const [resetKey, setResetKey] = useState<number>(0);
  const [showAI, setShowAI] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('code');

  const gameContainerRef = useRef<HTMLDivElement>(null);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // Linker / Pre-processor
  const getCompiledCode = () => {
      const main = files.find(f => f.isMain);
      if (!main) return "";

      let compiled = main.content;

      // Recursive replacement for run_script(filename)
      // Limit iterations to prevent circular dependency infinite loops
      let iterations = 0;
      while (compiled.includes('run_script(') && iterations < 10) {
          compiled = compiled.replace(/run_script\(([^)]+)\)/g, (match, filename) => {
              const file = files.find(f => f.name === filename.trim());
              if (file) {
                  return `\n# --- START ${filename} ---\n${file.content}\n# --- END ${filename} ---\n`;
              }
              return `# ERROR: File ${filename} not found\n`;
          });
          iterations++;
      }
      
      return compiled;
  };

  useEffect(() => {
    const errors = RoadScriptInterpreter.validateScript(activeFile.content);
    setSyntaxErrors(errors);
  }, [activeFile.content]);

  const handleRunToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setRuntimeError(null);
      setIsPlaying(true);
      setTimeout(() => gameContainerRef.current?.focus(), 100);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setResetKey(prev => prev + 1);
    setRuntimeError(null);
  };

  const handleCodeChange = (newCode: string) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newCode } : f));
  };

  const handleInjectCode = (snippet: string) => {
      const newCode = activeFile.content + "\n" + snippet;
      handleCodeChange(newCode);
  };

  const handleFileAdd = () => {
      const newId = Math.random().toString(36).substr(2, 9);
      setFiles([...files, { id: newId, name: `script_${newId}.rw`, content: '', isMain: false }]);
      setActiveFileId(newId);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-neutral-950 text-neutral-200">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            RoadWeight<span className="text-neutral-500 font-mono text-sm ml-2">STUDIO v3.1</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-800 rounded-lg p-1">
             <button onClick={() => setViewMode('code')} className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'code' ? 'bg-neutral-700 text-white shadow' : 'text-neutral-400 hover:text-white'}`}><Code2 className="w-4 h-4" /> Code</button>
             <button onClick={() => setViewMode('designer')} className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'designer' ? 'bg-pink-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}><PenTool className="w-4 h-4" /> Design</button>
             <button onClick={() => setViewMode('blocks')} className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'blocks' ? 'bg-blue-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}><Layers className="w-4 h-4" /> Blocks</button>
             <button onClick={() => setViewMode('nodes')} className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'nodes' ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}><Network className="w-4 h-4" /> Nodes</button>
          </div>

          <div className="h-6 w-px bg-neutral-700 mx-1" />

          <button onClick={() => setShowAI(!showAI)} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${showAI ? 'bg-purple-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'}`}>
            <Sparkles className="w-4 h-4" /> AI
          </button>
          
          <button onClick={handleReset} className="p-2 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white"><RefreshCw className="w-5 h-5" /></button>
          
          <button onClick={handleRunToggle} className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold transition-all ${isPlaying ? 'bg-red-500/10 text-red-400 border border-red-500/50' : 'bg-green-600 text-white'}`}>
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {isPlaying ? 'STOP' : 'RUN'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <FileSidebar 
            files={files} 
            activeFileId={activeFileId} 
            onFileSelect={setActiveFileId} 
            onFileAdd={handleFileAdd}
            onFileDelete={(id) => {
                const newFiles = files.filter(f => f.id !== id);
                setFiles(newFiles);
                if(activeFileId === id) setActiveFileId(newFiles[0]?.id || '');
            }}
            onFileUpdateName={(id, name) => setFiles(files.map(f => f.id === id ? {...f, name} : f))}
            assets={assets}
            onAssetAdd={(a) => setAssets([...assets, a])}
            onInjectCode={handleInjectCode}
        />

        {/* Editor Pane */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-neutral-800 bg-[#0d0d0d]">
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/50 border-b border-neutral-800 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5" /> <span>{activeFile.name}</span>
            </div>
            {syntaxErrors.length > 0 && <span className="text-red-400">{syntaxErrors.length} Errors</span>}
          </div>
          
          {viewMode === 'code' && <CodeEditor code={activeFile.content} onChange={handleCodeChange} errors={syntaxErrors} />}
          {viewMode === 'designer' && <SceneDesigner code={activeFile.content} onChange={handleCodeChange} />}
          {viewMode === 'blocks' && <BlocksEditor code={activeFile.content} onChange={handleCodeChange} />}
          {viewMode === 'nodes' && <NodesEditor code={activeFile.content} onChange={handleCodeChange} />}
        </div>

        {/* Game Pane */}
        <div className="flex-1 flex flex-col bg-neutral-900 relative">
           {showAI && (
            <div className="absolute top-0 right-0 left-0 z-20 p-4 pointer-events-none">
                <div className="pointer-events-auto max-w-2xl mx-auto shadow-2xl">
                   <AIAssistant currentCode={activeFile.content} errors={syntaxErrors} onCodeGenerated={handleCodeChange} onClose={() => setShowAI(false)} />
                </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] relative" ref={gameContainerRef} tabIndex={0}>
            <div className="relative shadow-2xl rounded-sm overflow-hidden border-4 border-neutral-800 bg-black">
              <GameCanvas 
                code={isPlaying ? getCompiledCode() : activeFile.content} 
                isPlaying={isPlaying} 
                resetKey={resetKey}
                onError={setRuntimeError}
              />
              {!isPlaying && !runtimeError && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2 tracking-wider">SYSTEM READY</h2>
                    <p className="text-neutral-400 text-sm font-mono">Press RUN to compile and execute project</p>
                  </div>
                </div>
              )}
              {runtimeError && (
                <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex items-center justify-center z-20 p-8">
                  <div className="bg-black/90 p-6 border border-red-500 rounded max-w-md w-full">
                    <h3 className="font-bold text-red-500 mb-4">RUNTIME EXCEPTION</h3>
                    <p className="font-mono text-sm text-red-200 mb-4">{runtimeError}</p>
                    <button onClick={handleReset} className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded font-mono text-xs uppercase">System Reset</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="h-48 border-t border-neutral-800 bg-neutral-950 p-4 overflow-y-auto font-mono text-xs">
            <h3 className="text-neutral-500 font-bold mb-2 uppercase tracking-wider text-[10px]">Reference Manual</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-neutral-400">
               <div><span className="text-purple-400">notefyshics(C4)</span> - Play Note</div>
               <div><span className="text-purple-400">reproduceanim.media(tag)(URL)</span> - Anim Sprite</div>
               <div><span className="text-blue-400">run_script(NAME.rw)</span> - Include File</div>
               <div><span className="text-green-400">unlost(save/load)</span> - Save Game</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}