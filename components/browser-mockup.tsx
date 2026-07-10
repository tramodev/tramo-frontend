import React from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Link as LinkIcon, 
  LayoutTemplate, 
  Search,
  Settings,
  Share2,
  MoreHorizontal,
  Hash,
  FileText,
  Network
} from 'lucide-react';

export const BrowserMockup: React.FC = () => {
  return (
    <div className="w-full aspect-[16/10] bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl shadow-black/50 flex overflow-hidden ring-4 ring-black/20">
      <div className="w-64 bg-neutral-900 flex flex-col border-r border-neutral-800 hidden md:flex shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-neutral-800 gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#0061A4] to-[#6B5778] flex items-center justify-center text-[10px] font-bold border border-transparent text-white shadow-lg">
                A
            </div>
            <span className="text-sm font-medium text-white">Alex's Brain</span>
            <div className="flex-1"></div>
            <Settings className="w-4 h-4 text-neutral-500 hover:text-white cursor-pointer transition-colors" />
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-800/50 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all text-sm mb-4 border border-neutral-800 hover:border-neutral-700">
                <Search className="w-4 h-4 text-neutral-500" />
                <span className="opacity-70">Search...</span>
                <span className="ml-auto text-[10px] opacity-50 border border-neutral-700 rounded px-1 bg-neutral-900">⌘K</span>
            </button>
            <div className="mb-6">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-2">Favorites</h3>
                <ul className="space-y-0.5">
                    <li className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0061A4]/15 text-[#5AB2FF] text-sm cursor-pointer border-l-2 border-[#0061A4] font-medium">
                        <Network className="w-4 h-4 text-[#5AB2FF]" />
                        Graph View
                    </li>
                    <li className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white text-sm cursor-pointer transition-colors">
                        <FileText className="w-4 h-4 text-neutral-500" />
                        Daily Notes
                    </li>
                </ul>
            </div>

            {/* Section: Recent */}
            <div className="mb-6">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-3 mb-2">Recent Nodes</h3>
                <ul className="space-y-0.5">
                    <li className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white text-sm cursor-pointer transition-colors">
                        <Hash className="w-3 h-3 text-neutral-600" />
                        System Design
                    </li>
                    <li className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white text-sm cursor-pointer transition-colors">
                        <Hash className="w-3 h-3 text-neutral-600" />
                        React 19 Hooks
                    </li>
                    <li className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white text-sm cursor-pointer transition-colors">
                        <Hash className="w-3 h-3 text-neutral-600" />
                        Medieval History
                    </li>
                </ul>
            </div>
        </div>
        <div className="p-3 border-t border-neutral-800">
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white bg-neutral-800 hover:bg-neutral-700 transition-all text-sm font-medium border border-neutral-700 shadow-sm group">
                <Plus className="w-4 h-4 text-[#5AB2FF] group-hover:scale-110 transition-transform" />
                New Node
            </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-neutral-950">
        <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 gap-4">
            <div className="flex items-center gap-2 text-neutral-500">
                <ChevronLeft className="w-4 h-4 hover:text-white cursor-pointer" />
                <ChevronRight className="w-4 h-4 hover:text-white cursor-pointer" />
            </div>
            
            <div className="flex-1 max-w-xl mx-auto h-8 bg-neutral-950 rounded-md flex items-center justify-center gap-2 text-xs text-neutral-400 px-4 cursor-text border border-neutral-800 transition-colors hover:border-neutral-600 hover:text-neutral-300">
                <LinkIcon className="w-3 h-3 opacity-50" />
                <span className="text-[#5AB2FF] opacity-80">mypath.app</span>
                <span className="text-neutral-700">/</span>
                <span>u</span>
                <span className="text-neutral-700">/</span>
                <span>alex</span>
                <span className="text-neutral-700">/</span>
                <span className="text-white font-medium">graph</span>
            </div>

            <div className="flex items-center gap-3 text-neutral-500">
               <Share2 className="w-4 h-4 hover:text-white cursor-pointer" />
               <MoreHorizontal className="w-4 h-4 hover:text-white cursor-pointer" />
            </div>
        </div>
        <div className="flex-1 bg-neutral-950 relative overflow-hidden group cursor-crosshair">
            <div className="absolute inset-0" 
                 style={{ 
                     backgroundImage: 'radial-gradient(#262626 1px, transparent 1px)', 
                     backgroundSize: '24px 24px' 
                 }}>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-[#0061A4] flex items-center justify-center shadow-[0_0_30px_rgba(0,97,164,0.4)] animate-pulse">
                    <Network className="w-8 h-8 text-[#5AB2FF]" />
                </div>
                <span className="mt-3 text-sm font-semibold text-white bg-neutral-900/90 px-3 py-1 rounded-full backdrop-blur-md border border-neutral-800 shadow-lg">Knowledge Graph</span>
            </div>
            <div className="absolute top-[30%] left-[30%] flex flex-col items-center z-10">
                <div className="w-4 h-4 rounded-full bg-neutral-900 border-2 border-neutral-500 hover:border-white hover:scale-150 transition-all cursor-pointer shadow-sm"></div>
                <span className="mt-2 text-[10px] font-medium text-neutral-400 bg-neutral-900/80 px-1 rounded border border-neutral-800">System Design</span>
            </div>
            <svg className="absolute inset-0 pointer-events-none">
                <line x1="50%" y1="50%" x2="30%" y2="30%" stroke="#404040" strokeWidth="2" />
            </svg>

            <div className="absolute top-[60%] left-[70%] flex flex-col items-center z-10">
                <div className="w-6 h-6 rounded-full bg-neutral-900 border-2 border-neutral-500 hover:border-white hover:scale-125 transition-all cursor-pointer shadow-sm"></div>
                <span className="mt-2 text-[10px] font-medium text-neutral-400 bg-neutral-900/80 px-1 rounded border border-neutral-800">Medieval History</span>
            </div>
            <svg className="absolute inset-0 pointer-events-none">
                <line x1="50%" y1="50%" x2="70%" y2="60%" stroke="#404040" strokeWidth="2" />
            </svg>

            <div className="absolute top-[20%] left-[60%] flex flex-col items-center z-10">
                 <div className="w-3 h-3 rounded-full bg-neutral-900 border-2 border-neutral-600 hover:border-white hover:scale-150 transition-all cursor-pointer shadow-sm"></div>
                 <span className="mt-2 text-[10px] font-medium text-neutral-400 bg-neutral-900/80 px-1 rounded border border-neutral-800">React 19 Hooks</span>
            </div>
            <svg className="absolute inset-0 pointer-events-none">
                <line x1="50%" y1="50%" x2="60%" y2="20%" stroke="#404040" strokeWidth="2" />
            </svg>
            <svg className="absolute inset-0 pointer-events-none">
                <line x1="70%" y1="60%" x2="60%" y2="20%" stroke="#333" strokeWidth="1" strokeDasharray="4 4" />
            </svg>

             <div className="absolute top-[75%] left-[40%] flex flex-col items-center z-10">
                 <div className="w-5 h-5 rounded-full bg-neutral-900 border-2 border-neutral-600 hover:border-white hover:scale-150 transition-all cursor-pointer shadow-sm"></div>
                 <span className="mt-2 text-[10px] font-medium text-neutral-400 bg-neutral-900/80 px-1 rounded border border-neutral-800">Daily Notes</span>
            </div>
            <svg className="absolute inset-0 pointer-events-none">
                <line x1="50%" y1="50%" x2="40%" y2="75%" stroke="#404040" strokeWidth="2" />
            </svg>

            <div className="absolute bottom-6 right-6 flex gap-2">
                <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg shadow-lg hover:border-neutral-600 cursor-pointer text-neutral-400 hover:text-white transition-all">
                    <Plus className="w-4 h-4" />
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg shadow-lg hover:border-neutral-600 cursor-pointer text-neutral-400 hover:text-white transition-all">
                    <Minus className="w-4 h-4" />
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg shadow-lg hover:border-neutral-600 cursor-pointer text-neutral-400 hover:text-white transition-all">
                    <LayoutTemplate className="w-4 h-4" />
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

const Minus = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);