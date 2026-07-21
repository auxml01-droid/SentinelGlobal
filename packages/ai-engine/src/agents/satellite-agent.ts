import { BaseAgent } from './base-agent';
import { AIAgentType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export class SatelliteAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.SATELLITE, 'Analista de Satélites');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const recent = this.getRecentEvents(context.events, 120);
    const wildfires = recent.filter((e) => e.subType === 'wildfire');
    const storms = recent.filter((e) => e.subType === 'storm' || e.subType === 'hurricane');

    let summary = 'Monitoramento por satélite ativo. ';
    if (wildfires.length > 0) {
      summary += `${wildfires.length} focos de incêndio detectados por satélite. `;
    }
    if (storms.length > 0) {
      summary += `${storms.length} sistemas de tempestade identificados. `;
    }
    if (wildfires.length === 0 && storms.length === 0) {
      summary += 'Nenhuma anomalia significativa detectada por sensoriamento remoto.';
    }

    const analysis = this.createAnalysis({
      title: 'Análise de imagens de satélite',
      summary,
      confidence: 85,
      relatedEvents: [...wildfires, ...storms].map((e) => e.id),
    });

    return { analysis, confidence: 85 };
  }
}
