import { BaseAgent } from './base-agent.js';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types.js';

export class EarthquakeAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.EARTHQUAKE, 'Analista Sísmico');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const quakes = context.events.filter(
      (e) => e.subType === EventSubType.EARTHQUAKE,
    );
    const recent = this.getRecentEvents(quakes, 120);
    const significant = recent.filter((e) => (e.impact.magnitude ?? 0) >= 5);

    const total = recent.length;
    const significantCount = significant.length;
    const avgMag =
      recent.reduce((sum, e) => sum + (e.impact.magnitude ?? 0), 0) /
      Math.max(total, 1);

    let summary = '';
    if (total === 0) {
      summary = 'Nenhuma atividade sísmica significativa registrada nas últimas 2 horas.';
    } else {
      summary = `Nas últimas 2 horas ocorreram ${total} terremotos`;
      if (significantCount > 0) {
        summary += `, sendo ${significantCount} acima de magnitude 5.0`;
      }
      summary += `. Magnitude média: ${avgMag.toFixed(1)}.`;
      if (significantCount >= 3) {
        summary += ' Há aumento significativo de atividade sísmica. Recomenda-se monitoramento contínuo.';
      }
    }

    const analysis = this.createAnalysis({
      title: significantCount > 0
        ? `Atividade sísmica elevada: ${significantCount} eventos ≥ M5.0`
        : 'Atividade sísmica dentro da normalidade',
      summary,
      confidence: 85,
      relatedEvents: recent.map((e) => e.id),
      predictions: significantCount >= 3
        ? [{
            eventType: 'earthquake',
            probability: Math.min(significantCount * 8, 60),
            timeframe: '24 horas',
            description: 'Probabilidade elevada de réplicas e novos eventos sísmicos',
            severity: Math.min(avgMag + 1, 9),
          }]
        : undefined,
    });

    return { analysis, confidence: 85 };
  }
}
