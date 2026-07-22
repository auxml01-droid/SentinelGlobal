import { BaseAgent } from './base-agent.js';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types.js';

export class CyberAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.CYBER, 'Analista de Cibersegurança');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const cyberEvents = context.events.filter(
      (e) => e.subType === EventSubType.CYBER_ATTACK,
    );
    const recent = this.getRecentEvents(cyberEvents, 360);

    const critical = recent.filter((e) => e.riskScore >= 70);

    let summary = `Monitoramento cibernético: ${recent.length} ataques nas últimas 6 horas.`;
    if (critical.length > 0) {
      summary += ` ${critical.length} ataques de alto risco.`;
    }

    const analysis = this.createAnalysis({
      title: critical.length > 0
        ? `🚨 ${critical.length} ataques cibernéticos críticos detectados`
        : `${recent.length} ataques cibernéticos nas últimas 6 horas`,
      summary,
      confidence: 75,
      relatedEvents: recent.map((e) => e.id),
      recommendations: critical.length > 0
        ? ['Alertar equipes de segurança digital', 'Ativar protocolo de resposta a incidentes']
        : undefined,
    });

    return { analysis, confidence: 75 };
  }
}
