import React, { useState } from 'react';
import { File, Folder, Image, Plus, Trash2, Film, Music, Copy, Check, Box, Download } from 'lucide-react';
import { ProjectFile, Asset } from '../types';
import { EXTENSIONS_LIST } from '../constants';

interface FileSidebarProps {
  files: ProjectFile[];
  activeFileId: string;
  onFileSelect: (id: string) => void;
  onFileAdd: () => void;
  onFileDelete: (id: string) => void;
  onFileUpdateName: (id: string, name: string) => void;
  assets: Asset[];
  onAssetAdd: (asset: Asset) => void;
  onInjectCode: (code: string) => void;
}

export default function FileSidebar({ 
  files, activeFileId, onFileSelect, onFileAdd, onFileDelete, onFileUpdateName,
  assets, onAssetAdd, onInjectCode
}: FileSidebarProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'assets' | 'ext'>('files');
  const [newUrl, setNewUrl] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddAsset = () => {
    if (!newUrl || !newAssetName) return;
    const type = newUrl.match(/\.(mp4|webm)$/) ? 'video' : newUrl.match(/\.(mp3|wav)$/) ? 'audio' : 'image';
    onAssetAdd({
        id: Math.random().toString(),
        name: newAssetName,
        url: newUrl,
        type
    });
    setNewUrl('');
    setNewAssetName('');
  };

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full">
      <div className="flex border-b border-neutral-800">
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'files' ? 'text-white border-b-2 border-purple-500 bg-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Files
        </button>
        <button 
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'assets' ? 'text-white border-b-2 border-purple-500 bg-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Assets
        </button>
        <button 
          onClick={() => setActiveTab('ext')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'ext' ? 'text-white border-b-2 border-purple-500 bg-neutral-800' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Ext
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'files' && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-2 py-1 mb-2 text-neutral-500 text-xs font-bold">
               <span>SCRIPTS</span>
               <button onClick={onFileAdd} className="hover:text-white"><Plus className="w-4 h-4" /></button>
            </div>
            {files.map(file => (
              <div 
                key={file.id} 
                className={`group flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${activeFileId === file.id ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                onClick={() => onFileSelect(file.id)}
              >
                <File className="w-4 h-4 shrink-0" />
                <input 
                  value={file.name}
                  onChange={(e) => onFileUpdateName(file.id, e.target.value)}
                  className="bg-transparent border-none focus:outline-none w-full"
                  onClick={(e) => e.stopPropagation()}
                />
                {!file.isMain && (
                   <button onClick={(e) => { e.stopPropagation(); onFileDelete(file.id); }} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                   </button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="flex flex-col gap-4 p-2">
             <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                <h4 className="text-xs font-bold text-neutral-400 mb-2">ADD NEW ASSET</h4>
                <input 
                   placeholder="Name (e.g. hero_run)"
                   className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs mb-2 text-white"
                   value={newAssetName} onChange={e => setNewAssetName(e.target.value)}
                />
                <input 
                   placeholder="URL (https://...)"
                   className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs mb-2 text-white"
                   value={newUrl} onChange={e => setNewUrl(e.target.value)}
                />
                <button 
                  onClick={handleAddAsset}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1.5 rounded"
                >
                  Add Asset
                </button>
             </div>

             <div className="flex flex-col gap-2">
                {assets.map(asset => (
                    <div key={asset.id} className="group relative flex items-center gap-3 bg-neutral-800/50 p-2 rounded border border-neutral-700 hover:border-neutral-500 transition-colors">
                        <div className="w-10 h-10 bg-black rounded flex items-center justify-center overflow-hidden shrink-0">
                           {asset.type === 'image' && <img src={asset.url} className="w-full h-full object-cover" />}
                           {asset.type === 'video' && <Film className="w-5 h-5 text-neutral-500" />}
                           {asset.type === 'audio' && <Music className="w-5 h-5 text-neutral-500" />}
                        </div>
                        <div className="overflow-hidden flex-1">
                           <div className="text-xs font-bold text-white truncate">{asset.name}</div>
                           <div className="text-[10px] text-neutral-500 truncate">{asset.url}</div>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(asset.url, asset.id)}
                            className="absolute right-2 top-2 p-1.5 bg-black/50 text-white rounded hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy URL"
                        >
                            {copiedId === asset.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                ))}
                {assets.length === 0 && <div className="text-center text-xs text-neutral-600 py-4">No assets added</div>}
             </div>
          </div>
        )}

        {activeTab === 'ext' && (
             <div className="flex flex-col gap-3 p-2">
                 <div className="text-[10px] text-neutral-500 uppercase font-bold px-1">Available Extensions</div>
                 {EXTENSIONS_LIST.map(ext => (
                     <div key={ext.id} className="bg-neutral-800 border border-neutral-700 p-3 rounded hover:border-indigo-500 transition-colors">
                         <div className="flex items-center gap-2 mb-1">
                             <Box className="w-4 h-4 text-indigo-400" />
                             <span className="text-sm font-bold text-white">{ext.name}</span>
                         </div>
                         <p className="text-xs text-neutral-400 mb-2">{ext.description}</p>
                         <button 
                            onClick={() => onInjectCode(ext.code)}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white py-1.5 rounded text-xs font-bold transition-all"
                         >
                             <Download className="w-3 h-3" /> Install
                         </button>
                     </div>
                 ))}
             </div>
        )}
      </div>
    </div>
  );
}