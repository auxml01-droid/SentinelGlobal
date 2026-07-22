import { BaseAgent } from './base-agent.js';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types.js';

export class HealthAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.HEALTH, 'Analista de Saúde Global');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const healthEvents = context.events.filter(
      (e) =>
        e.subType === EventSubType.PANDEMIC ||
        e.subType === EventSubType.EPIDEMIC ||
        e.subType === EventSubType.WHO_ALERT ||
        e.subType === EventSubType.NEW_VIRUS,
    );

    const recent = this.getRecentEvents(healthEvents, 720);
    const pandemics = recent.filter((e) => e.subType === EventSubType.PANDEMIC);
    const whoAlerts = recent.filter((e) => e.subType === EventSubType.WHO_ALERT);

    let summary = `Monitoramento de saúde global: ${recent.length} alertas ativos.`;
    if (pandemics.length > 0) {
      summary += ` ${pandemics.length} pandemia(s) em curso.`;
    }
    if (whoAlerts.length > 0) {
      summary += ` ${whoAlerts.length} alerta(s) da OMS.`;
    }

    const analysis = this.createAnalysis({
      title: pandemics.length > 0
        ? '⚠️ Pandemia ativa - Monitoramento intensificado'
        : whoAlerts.length > 0
          ? 'Alertas da OMS em monitoramento'
          : 'Situação sanitária global estável',
      summary,
      confidence: 85,
      relatedEvents: recent.map((e) => e.id),
    });

    return { analysis, confidence: 85 };
  }
}
