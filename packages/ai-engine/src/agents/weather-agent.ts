import { BaseAgent } from './base-agent';
import { AIAgentType, EventSubType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export class WeatherAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.WEATHER, 'Analista Climático');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const storms = context.events.filter(
      (e) =>
        e.subType === EventSubType.STORM ||
        e.subType === EventSubType.HURRICANE ||
        e.subType === EventSubType.TORNADO,
    );
    const recent = this.getRecentEvents(storms, 240);
    const hurricanes = recent.filter((e) => e.subType === EventSubType.HURRICANE);

    let summary = `Monitoramento climático: ${recent.length} eventos ativos.`;
    if (hurricanes.length > 0) {
      summary += ` ${hurricanes.length} furacões em atividade.`;
    }

    const analysis = this.createAnalysis({
      title: hurricanes.length > 0
        ? `${hurricanes.length} furacão(ões) ativo(s) - Monitoramento intensificado`
        : 'Condições climáticas dentro dos parâmetros esperados',
      summary,
      confidence: 80,
      relatedEvents: recent.map((e) => e.id),
    });

    return { analysis, confidence: 80 };
  }
}
