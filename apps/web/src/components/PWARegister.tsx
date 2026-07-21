'use client';

import { useEffect, useState } from 'react';

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ PWA: Service Worker registrado', reg.scope);
          reg.update();
        })
        .catch((err) => console.warn('⚠️ PWA: Falha ao registrar SW', err));
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const result = await (installPrompt as any).userChoice;
    setShowPrompt(false);
    setInstallPrompt(null);
    console.log(`✅ PWA: Usuário ${result.outcome === 'accepted' ? 'instalou' : 'recusou'} o app`);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    setInstallPrompt(null);
  };

  return showPrompt ? (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up rounded-lg border border-blue-500/30 bg-sentinel-800 p-4 shadow-lg shadow-blue-500/10">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🛰️</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Instalar SentinelGlobal</p>
          <p className="text-xs text-sentinel-400">Adicione à tela inicial para acesso rápido</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={dismissPrompt}
          className="rounded px-3 py-1 text-xs text-sentinel-400 hover:text-sentinel-200"
        >
          Agora não
        </button>
        <button
          onClick={handleInstall}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          Instalar
        </button>
      </div>
    </div>
  ) : null;
}
