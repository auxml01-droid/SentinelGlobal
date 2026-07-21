'use client';

interface AIAnalysisProps {
  analysis?: {
    title: string;
    summary: string;
    timestamp: string;
    confidence: number;
  };
}

export function AIAnalysis({ analysis }: AIAnalysisProps) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-sm font-semibold text-white">Análise de IA</h3>
        </div>
        <p className="mt-2 text-xs text-sentinel-400">
          Aguardando dados para análise...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-purple-500/30 bg-sentinel-800 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-sm font-semibold text-white">Análise de IA</h3>
        </div>
        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
          {analysis.confidence}% confiança
        </span>
      </div>
      <h4 className="mb-1 text-sm font-medium text-purple-300">{analysis.title}</h4>
      <p className="mb-2 text-xs leading-relaxed text-sentinel-200">
        {analysis.summary}
      </p>
      <span className="text-xs text-sentinel-500">
        {new Date(analysis.timestamp).toLocaleTimeString('pt-BR')}
      </span>
    </div>
  );
}
