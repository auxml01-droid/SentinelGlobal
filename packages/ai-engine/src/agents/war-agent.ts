import { BaseAgent } from './base-agent';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export class WarAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.WAR, 'Analista de Conflitos');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const conflicts = context.events.filter(
      (e) =>
        e.subType === EventSubType.WAR ||
        e.subType === EventSubType.MILITARY_ATTACK ||
        e.subType === EventSubType.BOMBING ||
        e.subType === EventSubType.MISSILE_LAUNCH,
    );

    const recent = this.getRecentEvents(conflicts, 360);
    const attacks = recent.filter(
      (e) => e.subType === EventSubType.MILITARY_ATTACK,
    );
    const missileLaunches = recent.filter(
      (e) => e.subType === EventSubType.MISSILE_LAUNCH,
    );

    let summary = `Análise de conflitos: ${recent.length} eventos nas últimas 6 horas.`;
    if (attacks.length > 0) {
      summary += ` ${attacks.length} ataques militares registrados.`;
    }
    if (missileLaunches.length > 0) {
      summary += ` ${missileLaunches.length} lançamentos de mísseis detectados.`;
    }

    const analysis = this.createAnalysis({
      title: recent.length > 0
        ? `${recent.length} eventos de conflito nas últimas 6 horas`
        : 'Nenhum conflito significativo detectado',
      summary,
      confidence: 75,
      relatedEvents: recent.map((e) => e.id),
      recommendations: recent.length > 5
        ? ['Ativar monitoramento contínuo da região', 'Notificar autoridades de defesa civil']
        : undefined,
    });

    return { analysis, confidence: 75 };
  }
}
