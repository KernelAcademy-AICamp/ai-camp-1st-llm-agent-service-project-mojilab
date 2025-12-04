'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface GenerationState {
  isGenerating: boolean;
  theme: string;
  progress: number;
  completed: number;
  total: number;
}

interface GenerationContextType {
  generation: GenerationState;
  startGeneration: (theme: string, total: number) => void;
  updateProgress: (progress: number, completed: number) => void;
  endGeneration: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState<GenerationState>({
    isGenerating: false,
    theme: '',
    progress: 0,
    completed: 0,
    total: 0,
  });

  const startGeneration = (theme: string, total: number) => {
    setGeneration({
      isGenerating: true,
      theme,
      progress: 0,
      completed: 0,
      total,
    });
  };

  const updateProgress = (progress: number, completed: number) => {
    setGeneration((prev) => ({
      ...prev,
      progress,
      completed,
    }));
  };

  const endGeneration = () => {
    setGeneration({
      isGenerating: false,
      theme: '',
      progress: 0,
      completed: 0,
      total: 0,
    });
  };

  return (
    <GenerationContext.Provider
      value={{ generation, startGeneration, updateProgress, endGeneration }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

// Default context for SSR/SSG
const defaultContext: GenerationContextType = {
  generation: {
    isGenerating: false,
    theme: '',
    progress: 0,
    completed: 0,
    total: 0,
  },
  startGeneration: () => {},
  updateProgress: () => {},
  endGeneration: () => {},
};

export function useGeneration() {
  const context = useContext(GenerationContext);
  // Return default context during SSR/SSG when provider is not available
  if (context === undefined) {
    return defaultContext;
  }
  return context;
}
