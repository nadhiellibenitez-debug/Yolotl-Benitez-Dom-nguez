import React, { useState } from 'react';
import { X, Sparkles, Loader2, ArrowRight, Wrench } from 'lucide-react';
import { generateScript } from '../services/geminiService';
import { ScriptError } from '../types';

interface AIAssistantProps {
  currentCode?: string;
  errors?: ScriptError[];
  onCodeGenerated: (code: string) => void;
  onClose: () => void;
}

export default function AIAssistant({ currentCode, errors, onCodeGenerated, onClose }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    runGeneration(prompt);
  };

  const handleFixErrors = () => {
      if (!currentCode) return;
      const errorMsg = errors?.map(e => `Line ${e.line}: ${e.message}`).join('\n') || "Unknown syntax issues";
      // We pass the code itself as the prompt for the 'Fix' mode in logic
      runGeneration(currentCode, errorMsg);
  };

  const runGeneration = async (promptText: string, errorContext?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const code = await generateScript(promptText, errorContext);
      if (code) {
        onCodeGenerated(code);
        onClose();
      } else {
        setError('Failed to generate code. Please try again.');
      }
    } catch (err) {
        setError('An error occurred. Check your API Key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-purple-500/30 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-purple-900/20 p-4 border-b border-purple-500/20 flex justify-between items-center">
        <div className="flex items-center gap-2 text-purple-300">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-bold">Gemini Code Architect</h3>
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        <p className="text-neutral-300 mb-4 text-sm">
          Describe the game logic or mechanic you want to create.
        </p>

        {errors && errors.length > 0 && (
             <button 
                onClick={handleFixErrors}
                type="button"
                className="w-full mb-4 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 p-2 rounded transition-colors text-sm font-bold"
             >
                 <Wrench className="w-4 h-4" />
                 Fix {errors.length} Syntax Errors Detected
             </button>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a game where I dodge red balls..."
            className="w-full bg-neutral-950 border border-neutral-700 rounded-md p-3 text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 min-h-[100px] mb-4 font-sans text-sm"
            autoFocus
          />

          {error && (
            <div className="mb-4 text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900/50">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Code
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}