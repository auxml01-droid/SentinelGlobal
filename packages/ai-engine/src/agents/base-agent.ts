import { AIAgentType, AIAnalysis, GlobalEvent } from '@sentinel/types';
import { AgentContext, AgentResult } from '../types';

export abstract class BaseAgent {
  public readonly agentType: AIAgentType;
  public readonly name: string;

  constructor(agentType: AIAgentType, name: string) {
    this.agentType = agentType;
    this.name = name;
  }

  abstract analyze(context: AgentContext): Promise<AgentResult>;

  protected createAnalysis(params: {
    title: string;
    summary: string;
    confidence: number;
    relatedEvents: string[];
    predictions?: AIAnalysis['predictions'];
    recommendations?: string[];
  }): AIAnalysis {
    return {
      id: `${this.agentType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agentType: this.agentType,
      title: params.title,
      summary: params.summary,
      confidence: params.confidence,
      predictions: params.predictions,
      recommendations: params.recommendations,
      relatedEvents: params.relatedEvents,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  protected getRecentEvents(
    events: GlobalEvent[],
    minutes: number = 60,
  ): GlobalEvent[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return events.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  }
}
