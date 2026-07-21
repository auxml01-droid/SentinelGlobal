'use client';

import { useMemo } from 'react';

type SidebarItem = { name: string; icon: string; active: boolean } | 'divider';

interface SidebarProps {
  modules?: SidebarItem[];
  activeModule: string;
  onModuleChange: (name: string) => void;
}

const DEFAULT_MODULES: SidebarItem[] = [
  { name: 'Dashboard', icon: '📊', active: true },
  { name: 'Earth Monitor', icon: '🌍', active: false },
  { name: 'War Monitor', icon: '⚔️', active: false },
  { name: 'Nuclear Monitor', icon: '☢️', active: false },
  { name: 'Ocean Monitor', icon: '🌊', active: false },
  { name: 'Satellite', icon: '🛰️', active: false },
  { name: 'Inteligência', icon: '🧠', active: false },
  'divider',
  { name: 'Mapa Mundial', icon: '🗺️', active: false },
  { name: 'Saúde', icon: '🩺', active: false },
  { name: 'Admin', icon: '⚙️', active: false },
];

export function Sidebar({ modules = DEFAULT_MODULES, activeModule, onModuleChange }: SidebarProps) {
  return (
    <aside className="flex w-16 flex-col items-center gap-1 border-r border-sentinel-700 bg-sentinel-900 py-3">
      <div className="mb-4">
        <span className="text-2xl">🛰️</span>
      </div>
      {modules.map((mod, i) => {
        if (mod === 'divider') {
          return <div key={`divider-${i}`} className="my-1 h-px w-8 bg-sentinel-700" />;
        }
        return (
          <button
            key={mod.name}
            onClick={() => onModuleChange(mod.name)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-colors ${
              activeModule === mod.name
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-sentinel-400 hover:bg-sentinel-700 hover:text-sentinel-200'
            }`}
            title={mod.name}
          >
            {mod.icon}
          </button>
        );
      })}
    </aside>
  );
}
