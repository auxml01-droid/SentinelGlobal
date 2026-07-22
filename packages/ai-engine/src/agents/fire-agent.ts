import { BaseAgent } from './base-agent.js';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types.js';

export class FireAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.FIRE, 'Analista de Incêndios');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const fires = context.events.filter(
      (e) => e.subType === EventSubType.WILDFIRE,
    );
    const recent = this.getRecentEvents(fires, 240);

    const total = recent.length;
    const highRisk = recent.filter((e) => e.riskScore >= 60);

    let summary = `Monitoramento de incêndios: ${total} focos ativos.`;
    if (highRisk.length > 0) {
      summary += ` ${highRisk.length} focos com nível de risco elevado.`;
    }

    const analysis = this.createAnalysis({
      title: total > 0
        ? `${total} incêndios florestais ativos${highRisk.length > 0 ? ` - ${highRisk.length} críticos` : ''}`
        : 'Nenhum incêndio florestal significativo detectado',
      summary,
      confidence: 80,
      relatedEvents: recent.map((e) => e.id),
    });

    return { analysis, confidence: 80 };
  }
}
