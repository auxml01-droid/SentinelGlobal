import { BaseAgent } from './base-agent';
import { AIAgentType, EventCategory, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export class PredictionAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.PREDICTION, 'Analista Preditivo');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const recent = this.getRecentEvents(context.events, 720);
    const historical = context.events;

    const earthquakeCount = recent.filter(
      (e) => e.subType === EventSubType.EARTHQUAKE && (e.impact.magnitude ?? 0) >= 4,
    ).length;

    const historicalEarthquakeAvg = historical.filter(
      (e) => e.subType === EventSubType.EARTHQUAKE,
    ).length / Math.max(Math.ceil(historical.length / recent.length), 1);

    const anomaly = historicalEarthquakeAvg > 0
      ? ((earthquakeCount - historicalEarthquakeAvg) / historicalEarthquakeAvg) * 100
      : 0;

    let summary = '';
    const predictions = [];

    if (earthquakeCount > 0) {
      summary = `Atividade sísmica ${anomaly > 20 ? `${anomaly.toFixed(0)}% acima da média` : 'dentro da média histórica'}. `;

      if (anomaly > 30) {
        predictions.push({
          eventType: 'earthquake',
          probability: Math.min(Math.abs(anomaly) * 0.5, 70),
          timeframe: '48 horas',
          description: 'Probabilidade de novos eventos sísmicos significativos',
          severity: 6,
        });
      }
    }

    if (recent.length === 0) {
      summary = 'Dados insuficientes para análise preditiva no momento.';
    }

    const analysis = this.createAnalysis({
      title: predictions.length > 0
        ? '📊 Alerta preditivo: aumento de atividade sísmica'
        : 'Análise preditiva: parâmetros normais',
      summary: summary || 'Parâmetros dentro da normalidade estatística.',
      confidence: 65,
      predictions: predictions.length > 0 ? predictions : undefined,
      relatedEvents: recent.slice(0, 10).map((e) => e.id),
      recommendations: predictions.length > 0
        ? ['Manter monitoramento contínuo', 'Atualizar protocolos de resposta']
        : undefined,
    });

    return { analysis, confidence: 65 };
  }
}
