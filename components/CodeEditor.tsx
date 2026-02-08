import React, { useState, useRef, useEffect } from 'react';
import { ScriptError, Suggestion } from '../types';
import { AlertCircle, Command } from 'lucide-react';
import { COMMAND_LIST } from '../constants';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  errors?: ScriptError[];
}

export default function CodeEditor({ code, onChange, errors = [] }: CodeEditorProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    
    // Autocomplete Logic
    const selectionStart = e.target.selectionStart;
    setCursorIndex(selectionStart);
    
    // Find current word being typed
    const textBeforeCursor = val.slice(0, selectionStart);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord && currentWord.length > 1) {
        const matches = COMMAND_LIST.filter(cmd => 
            cmd.label.toLowerCase().includes(currentWord.toLowerCase())
        );
        setSuggestions(matches);
    } else {
        setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
      if (!textareaRef.current) return;
      
      const val = code;
      const textBeforeCursor = val.slice(0, cursorIndex);
      const textAfterCursor = val.slice(cursorIndex);
      
      // Remove current partial word
      const words = textBeforeCursor.split(/\s+/);
      const currentWord = words[words.length - 1];
      const newTextBefore = textBeforeCursor.slice(0, -currentWord.length);
      
      const newCode = newTextBefore + suggestion.insertText + textAfterCursor;
      onChange(newCode);
      setSuggestions([]);
      
      // Restore focus
      textareaRef.current.focus();
  };

  const lines = code.split('\n');

  return (
    <div className="flex-1 flex font-mono text-sm relative bg-[#0d0d0d] overflow-hidden">
      {/* Line Numbers */}
      <div className="bg-[#0d0d0d] text-neutral-600 text-right pr-3 pl-2 py-4 select-none border-r border-neutral-800 min-w-[3.5rem]">
        {lines.map((_, i) => {
          const lineNumber = i + 1;
          const error = errors.find(e => e.line === lineNumber);
          return (
            <div key={i} className="leading-6 flex justify-end gap-2 items-center relative group">
               {error && (
                 <div className="text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    <div className="absolute left-full ml-4 top-0 bg-red-900 text-white text-xs p-1 rounded z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none border border-red-700">
                       {error.message}
                    </div>
                 </div>
               )}
               <span className={error ? "text-red-400 font-bold" : ""}>{lineNumber}</span>
            </div>
          );
        })}
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 relative h-full w-full">
         <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onClick={(e) => setSuggestions([])} // Hide on click
            spellCheck={false}
            className="absolute inset-0 bg-transparent text-neutral-300 p-4 leading-6 resize-none focus:outline-none w-full h-full font-mono z-10"
            style={{ tabSize: 2 }}
        />
        
        {/* Error Underline Layer */}
        <div className="absolute inset-0 p-4 pointer-events-none z-0">
             {lines.map((line, i) => {
                const error = errors.find(e => e.line === i + 1);
                return (
                    <div key={i} className="leading-6 h-6 w-full">
                        {error && <div className="w-full h-full bg-red-900/20 border-b border-red-500/50"></div>}
                    </div>
                )
             })}
        </div>

        {/* Autocomplete Popup */}
        {suggestions.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-purple-500/50 max-h-40 overflow-y-auto z-20 shadow-2xl p-2 grid grid-cols-2 gap-2">
                {suggestions.map((s, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSuggestionClick(s)}
                        className="flex items-center gap-2 text-left p-2 hover:bg-neutral-800 rounded group transition-colors"
                    >
                        <div className="bg-purple-900/50 p-1 rounded text-purple-300 group-hover:bg-purple-600 group-hover:text-white">
                            <Command className="w-3 h-3" />
                        </div>
                        <div>
                            <div className="font-bold text-neutral-200 text-xs">{s.label}</div>
                            <div className="text-[10px] text-neutral-500 truncate">{s.detail}</div>
                        </div>
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}