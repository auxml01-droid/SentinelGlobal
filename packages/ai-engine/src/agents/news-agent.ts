import { BaseAgent } from './base-agent';
import { AIAgentType } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export class NewsAgent extends BaseAgent {
  constructor() {
    super(AIAgentType.NEWS, 'Analista de Notícias');
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const recent = this.getRecentEvents(context.events, 360);

    const categories = new Map<string, number>();
    for (const event of recent) {
      const cat = event.category;
      categories.set(cat, (categories.get(cat) ?? 0) + 1);
    }

    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    let summary = `Análise de cobertura: ${recent.length} eventos nas últimas 6 horas.`;
    if (topCategories.length > 0) {
      summary += ` Principais categorias: ${topCategories.map(([cat, count]) => `${cat} (${count})`).join(', ')}.`;
    }

    const analysis = this.createAnalysis({
      title: `Resumo de eventos: ${recent.length} ocorrências`,
      summary,
      confidence: 70,
      relatedEvents: recent.map((e) => e.id),
    });

    return { analysis, confidence: 70 };
  }
}
