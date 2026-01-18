
import React, { useState } from 'react';
import { Page } from '../types';

interface NavbarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
  onSearch: (query: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage, onSearch }) => {
  const [localQuery, setLocalQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      onSearch(localQuery);
      setLocalQuery('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between border-b border-white/10">
      <div className="flex items-center gap-8">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => setPage(Page.Home)}
        >
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-slate-900">AI</div>
          <span className="text-xl font-bold tracking-tight hidden lg:inline uppercase">AutoIntel Robotics</span>
        </div>
        
        <div className="hidden xl:flex items-center gap-2">
          {[
            { label: 'Home', value: Page.Home },
            { label: 'AI Textbook', value: Page.Textbook },
            { label: 'Simulation Lab', value: Page.Simulation },
            { label: 'Industry Insights', value: Page.Insights },
            { label: 'Metabolic Hub', value: Page.Energy },
            { label: 'Diagnostics', value: Page.Diagnostics },
            { label: 'Connectivity', value: Page.Connectivity }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPage(item.value)}
              className={`text-[10px] font-black transition-all px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-white/5 border border-transparent ${
                currentPage === item.value ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5' : 'text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end max-w-md ml-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Query knowledge base..."
            className="w-full bg-slate-900/50 border border-white/10 rounded-full px-10 py-2 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-slate-200"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>
        
        <a 
          href="https://github.com/example/autointel-robotics" 
          target="_blank" 
          rel="noreferrer"
          className="hidden sm:inline-block px-4 py-2 rounded-full border border-white/20 text-[10px] font-bold uppercase hover:bg-white/5 transition-all whitespace-nowrap"
        >
          Source
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
