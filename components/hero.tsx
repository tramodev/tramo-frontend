import React from 'react';
import { ArrowRight, Play } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="flex flex-col items-center text-center space-y-8 z-10">      
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-foreground px-4">
          Organize learning as <span className="inline-block">interconnected ideas,</span> <br className="hidden lg:block" />
          <span className="text-primary">
            not isolated notes.
          </span>
        </h1>
        <p className="text-lg md:text-2xl text-muted-foreground mt-6 max-w-3xl mx-auto leading-relaxed font-medium">
          — and share them when it matters.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4  w-full justify-center">
        <button className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground border border-primary rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg hover:bg-primary/90">
          Start for free
          <ArrowRight className="w-5 h-5" />
        </button>
        <button className="w-full sm:w-auto px-8 py-3.5 bg-background text-foreground border border-border rounded-full font-bold text-lg hover:bg-secondary active:scale-95 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md">
          <Play className="w-5 h-5 fill-current text-accent" />
          See how it works
        </button>
      </div>

    </div>
  );
};