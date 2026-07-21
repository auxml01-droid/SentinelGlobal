import { BaseAgent } from './base-agent';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export class NuclearAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.NUCLEAR, 'Analista Nuclear');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const nuclearEvents = context.events.filter(
      (e) => e.subType === EventSubType.NUCLEAR_LEAK,
    );
    const recent = this.getRecentEvents(nuclearEvents, 1440);

    let summary = recent.length > 0
      ? `${recent.length} evento(s) nuclear(es) nas últimas 24 horas. Monitoramento ativo.`
      : 'Nenhum incidente nuclear reportado nas últimas 24 horas.';

    const analysis = this.createAnalysis({
      title: recent.length > 0
        ? '⚠️ Incidente nuclear detectado'
        : 'Segurança nuclear: sem incidentes',
      summary,
      confidence: 90,
      relatedEvents: recent.map((e) => e.id),
      recommendations: recent.length > 0
        ? ['Ativar protocolo de emergência nuclear', 'Notificar AIEA']
        : undefined,
    });

    return { analysis, confidence: 90 };
  }
}
