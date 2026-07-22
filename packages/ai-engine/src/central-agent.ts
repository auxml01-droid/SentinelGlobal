import { AIAgentType, AIAnalysis, GlobalEvent } from '@sentinel/types';
import { BaseAgent } from './agents/base-agent.js';
import { EarthquakeAgent } from './agents/earthquake-agent.js';
import { WeatherAgent } from './agents/weather-agent.js';
import { WarAgent } from './agents/war-agent.js';
import { FireAgent } from './agents/fire-agent.js';
import { HealthAgent } from './agents/health-agent.js';
import { NuclearAgent } from './agents/nuclear-agent.js';
import { CyberAgent } from './agents/cyber-agent.js';
import { NewsAgent } from './agents/news-agent.js';
import { SatelliteAgent } from './agents/satellite-agent.js';
import { PredictionAgent } from './agents/prediction-agent.js';
import { AgentContext, CentralAgentResult } from './types.js';

export class CentralAgent {
  private agents: BaseAgent[];

  constructor() {
    this.agents = [
      new EarthquakeAgent(),
      new WeatherAgent(),
      new WarAgent(),
      new FireAgent(),
      new HealthAgent(),
      new NuclearAgent(),
      new CyberAgent(),
      new NewsAgent(),
      new SatelliteAgent(),
      new PredictionAgent(),
    ];
  }

  async analyzeAll(
    events: GlobalEvent[],
    timeRange: number = 720,
  ): Promise<CentralAgentResult> {
    const context: AgentContext = {
      events,
      history: [],
      timeRange,
    };

    const results = await Promise.all(
      this.agents.map((agent) => agent.analyze(context)),
    );

    const analyses = results.map((r) => r.analysis);

    const highConfidence = results.filter((r) => r.confidence >= 80);
    const criticalAnalyses = analyses.filter(
      (a) => a.predictions && a.predictions.length > 0,
    );

    const summary = this.generateSummary(analyses);
    const globalAssessment = this.generateGlobalAssessment(
      analyses,
      events.length,
    );

    return {
      summary,
      globalAssessment,
      predictions: criticalAnalyses,
      timestamp: new Date().toISOString(),
    };
  }

  private generateSummary(analyses: AIAnalysis[]): string {
    const total = analyses.length;
    const withAlerts = analyses.filter(
      (a) => a.predictions && a.predictions.length > 0,
    ).length;

    return `Análise completa: ${total} agentes processados, ${withAlerts} com alertas ativos.`;
  }

  private generateGlobalAssessment(
    analyses: AIAnalysis[],
    eventCount: number,
  ): string {
    const highestRisk = analyses.reduce(
      (max, a) => {
        const predRisk = a.predictions?.reduce(
          (sum, p) => sum + p.probability * p.severity,
          0,
        ) ?? 0;
        return predRisk > max.risk ? { analysis: a, risk: predRisk } : max;
      },
      { analysis: analyses[0]!, risk: 0 },
    );

    if (highestRisk.risk > 100) {
      return `Atenção máxima necessária. ${highestRisk.analysis.title}. Probabilidade elevada de eventos críticos.`;
    }

    return 'Situação global sob monitoramento. Nenhum evento de risco extremo identificado no momento.';
  }

  getAgent(agentType: AIAgentType): BaseAgent | undefined {
    return this.agents.find((a) => a.agentType === agentType);
  }
}
