import { GlobalEvent, EventCategory, EventSubType, EventStatus, RiskLevel } from '@sentinel/types';
import { CorrelationEngine, Correlation, CorrelationCluster } from '@sentinel/correlation-engine';
import { KnowledgeGraph, RiskPropagation } from '@sentinel/knowledge-graph';

export interface IntelligenceReport {
  id: string;
  timestamp: string;
  summary: string;
  riskAssessment: RiskAssessment;
  correlations: Correlation[];
  clusters: CorrelationCluster[];
  propagations: RiskPropagation[];
  recommendations: string[];
  confidence: number;
}

export interface RiskAssessment {
  globalRisk: number;
  topRisks: TopRisk[];
  emergingThreats: EmergingThreat[];
  stableAreas: string[];
}

export interface TopRisk {
  region: string;
  category: EventCategory;
  riskScore: number;
  eventCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface EmergingThreat {
  type: EventSubType;
  location: string;
  probability: number;
  timeFrame: string;
  indicators: string[];
}

export interface EventExplanation {
  eventId: string;
  title: string;
  why: string;
  impact: string;
  relatedEvents: string[];
  riskPropagation: RiskPropagation[];
  confidence: number;
}

export class IntelligenceEngine {
  private correlationEngine: CorrelationEngine;
  private knowledgeGraph: KnowledgeGraph;
  private eventHistory: GlobalEvent[] = [];
  private maxHistory = 1000;

  constructor() {
    this.correlationEngine = new CorrelationEngine();
    this.knowledgeGraph = new KnowledgeGraph();
  }

  processEvent(event: GlobalEvent): {
    correlations: Correlation[];
    propagations: RiskPropagation[];
  } {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    this.knowledgeGraph.addEvent(event);
    const correlations = this.correlationEngine.processEvent(event);

    let propagations: RiskPropagation[] = [];
    if (event.riskScore >= 60) {
      propagations = this.knowledgeGraph.propagateRisk(
        `event-${event.id}`,
        event.riskScore,
        2
      );
    }

    return { correlations, propagations };
  }

  generateReport(): IntelligenceReport {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = this.eventHistory.filter(
      (e) => new Date(e.timestamp) >= last24h
    );

    const riskAssessment = this.assessRisk(recentEvents);
    const correlations = this.correlationEngine.getCorrelations();
    const clusters = this.correlationEngine.getClusters();

    const highRiskEvents = recentEvents.filter((e) => e.riskScore >= 60);
    const propagations: RiskPropagation[] = [];
    for (const event of highRiskEvents.slice(0, 5)) {
      const props = this.knowledgeGraph.propagateRisk(
        `event-${event.id}`,
        event.riskScore,
        2
      );
      propagations.push(...props);
    }

    const recommendations = this.generateRecommendations(
      riskAssessment,
      correlations,
      clusters
    );

    const summary = this.generateSummary(
      recentEvents,
      riskAssessment,
      correlations,
      clusters
    );

    return {
      id: `report-${now.getTime()}`,
      timestamp: now.toISOString(),
      summary,
      riskAssessment,
      correlations: correlations.slice(0, 20),
      clusters: clusters.slice(0, 10),
      propagations: propagations.slice(0, 15),
      recommendations,
      confidence: this.calculateConfidence(recentEvents, correlations),
    };
  }

  explainEvent(eventId: string): EventExplanation | null {
    const event = this.eventHistory.find((e) => e.id === eventId);
    if (!event) return null;

    const correlations = this.correlationEngine.getCorrelationsForEvent(eventId);
    const relatedEventIds = correlations.flatMap((c) => c.relatedEventIds);
    const uniqueRelatedIds = [...new Set(relatedEventIds)].filter((id) => id !== eventId);

    const propagations = this.knowledgeGraph.propagateRisk(
      `event-${event.id}`,
      event.riskScore,
      2
    );

    const why = this.explainWhy(event, correlations);
    const impact = this.explainImpact(event, propagations);

    return {
      eventId: event.id,
      title: event.title,
      why,
      impact,
      relatedEvents: uniqueRelatedIds.slice(0, 5),
      riskPropagation: propagations.slice(0, 5),
      confidence: this.calculateExplanationConfidence(event, correlations),
    };
  }

  private assessRisk(events: GlobalEvent[]): RiskAssessment {
    const globalRisk = events.length > 0
      ? events.reduce((sum, e) => sum + e.riskScore, 0) / events.length
      : 0;

    const byRegion = new Map<string, { events: GlobalEvent[]; risk: number }>();
    for (const event of events) {
      const region = event.countryCode || 'UNKNOWN';
      const existing = byRegion.get(region) || { events: [], risk: 0 };
      existing.events.push(event);
      existing.risk = existing.events.reduce((s, e) => s + e.riskScore, 0) / existing.events.length;
      byRegion.set(region, existing);
    }

    const topRisks: TopRisk[] = Array.from(byRegion.entries())
      .map(([region, data]) => ({
        region,
        category: this.getDominantCategory(data.events),
        riskScore: data.risk,
        eventCount: data.events.length,
        trend: this.detectTrend(data.events) as 'increasing' | 'decreasing' | 'stable',
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);

    const emergingThreats = this.detectEmergingThreats(events);
    const stableAreas = Array.from(byRegion.entries())
      .filter(([_, data]) => data.risk < 30)
      .map(([region]) => region)
      .slice(0, 5);

    return {
      globalRisk,
      topRisks,
      emergingThreats,
      stableAreas,
    };
  }

  private getDominantCategory(events: GlobalEvent[]): EventCategory {
    const counts = new Map<EventCategory, number>();
    for (const event of events) {
      counts.set(event.category, (counts.get(event.category) || 0) + 1);
    }
    let maxCount = 0;
    let dominant = EventCategory.NATURAL_DISASTER;
    for (const [category, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        dominant = category;
      }
    }
    return dominant;
  }

  private detectTrend(events: GlobalEvent[]): string {
    if (events.length < 2) return 'stable';
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const mid = Math.floor(sorted.length / 2);
    const firstHalfAvg = sorted.slice(0, mid).reduce((s, e) => s + e.riskScore, 0) / mid;
    const secondHalfAvg = sorted.slice(mid).reduce((s, e) => s + e.riskScore, 0) / (sorted.length - mid);

    if (secondHalfAvg > firstHalfAvg * 1.2) return 'increasing';
    if (secondHalfAvg < firstHalfAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  private detectEmergingThreats(events: GlobalEvent[]): EmergingThreat[] {
    const threats: EmergingThreat[] = [];
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = events.filter((e) => new Date(e.timestamp) >= lastHour);

    const byType = new Map<EventSubType, GlobalEvent[]>();
    for (const event of recentEvents) {
      const existing = byType.get(event.subType) || [];
      existing.push(event);
      byType.set(event.subType, existing);
    }

    for (const [subType, typeEvents] of byType) {
      if (typeEvents.length >= 3) {
        const avgRisk = typeEvents.reduce((s, e) => s + e.riskScore, 0) / typeEvents.length;
        if (avgRisk >= 50) {
          const firstEvent = typeEvents[0];
          if (firstEvent) {
            threats.push({
              type: subType,
              location: firstEvent.countryCode || 'Múltiplas regiões',
              probability: Math.min(avgRisk, 95),
              timeFrame: 'Próximas 2-6 horas',
              indicators: [
                `${typeEvents.length} eventos nas últimas hora`,
                `risco médio: ${avgRisk.toFixed(0)}`,
                `tendência: ${this.detectTrend(typeEvents)}`,
              ],
            });
          }
        }
      }
    }

    return threats.slice(0, 3);
  }

  private generateRecommendations(
    riskAssessment: RiskAssessment,
    correlations: Correlation[],
    clusters: CorrelationCluster[]
  ): string[] {
    const recommendations: string[] = [];

    if (riskAssessment.globalRisk >= 60) {
      recommendations.push('Risco global elevado: manter alerta máximo');
    }

    if (riskAssessment.topRisks.length > 0) {
      const top = riskAssessment.topRisks[0];
      if (top) {
        recommendations.push(
          `Atenção especial para ${top.region}: ${top.eventCount} eventos de ${this.getCategoryLabel(top.category)}`
        );
      }
    }

    const cascadeCorrelations = correlations.filter((c) => c.correlationType === 'cascade');
    if (cascadeCorrelations.length > 0) {
      recommendations.push(
        `${cascadeCorrelations.length} correlações em cascata detectadas: monitorar eventos relacionados`
      );
    }

    const highRiskClusters = clusters.filter((c) => c.avgRiskScore >= 60);
    if (highRiskClusters.length > 0) {
      recommendations.push(
        `${highRiskClusters.length} clusters de alto risco identificados: considerar evacuação ou prepamento`
      );
    }

    if (riskAssessment.emergingThreats.length > 0) {
      const threat = riskAssessment.emergingThreats[0];
      if (threat) {
        recommendations.push(
          `Ameaça emergente: ${this.getSubTypeLabel(threat.type)} em ${threat.location} (${threat.probability}% probabilidade)`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Situação estável: manter monitoramento de rotina');
    }

    return recommendations;
  }

  private generateSummary(
    events: GlobalEvent[],
    riskAssessment: RiskAssessment,
    correlations: Correlation[],
    clusters: CorrelationCluster[]
  ): string {
    const activeEvents = events.filter(
      (e) => e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED
    );
    const highRisk = events.filter((e) => e.riskScore >= 60);

    let summary = `Relatório de Inteligência — ${events.length} eventos nas últimas 24h. `;
    summary += `Risco global: ${riskAssessment.globalRisk.toFixed(0)}/100. `;

    if (highRisk.length > 0) {
      summary += `${highRisk.length} eventos de alto risco. `;
    }

    if (correlations.length > 0) {
      summary += `${correlations.length} correlações detectadas. `;
    }

    if (clusters.length > 0) {
      summary += `${clusters.length} clusters identificados. `;
    }

    if (riskAssessment.emergingThreats.length > 0) {
      summary += `Ameaças emergentes detectadas. `;
    }

    return summary;
  }

  private explainWhy(event: GlobalEvent, correlations: Correlation[]): string {
    const parts: string[] = [];

    parts.push(`Evento classificado como ${this.getSubTypeLabel(event.subType)} com risco ${event.riskScore}/100.`);

    if (event.impact.magnitude) {
      parts.push(`Magnitude ${event.impact.magnitude.toFixed(1)}.`);
    }

    if (event.impact.fatalities) {
      parts.push(`${event.impact.fatalities} vítimas fatais reportadas.`);
    }

    const cascadeCorrelations = correlations.filter((c) => c.correlationType === 'cascade');
    if (cascadeCorrelations.length > 0) {
      parts.push(`Possivelmente relacionado a ${cascadeCorrelations.length} evento(s) anterior(es).`);
    }

    const spatialCorrelations = correlations.filter((c) => c.correlationType === 'spatial');
    if (spatialCorrelations.length > 0) {
      parts.push(`${spatialCorrelations.length} evento(s) na mesma região.`);
    }

    return parts.join(' ');
  }

  private explainImpact(event: GlobalEvent, propagations: RiskPropagation[]): string {
    const parts: string[] = [];

    if (event.impact.affectedArea) {
      parts.push(`Área afetada: ~${event.impact.affectedArea}km².`);
    }

    if (propagations.length > 0) {
      parts.push(
        `Risco pode se propagar para ${propagations.length} entidade(s) vizinha(s).`
      );
    }

    if (event.riskScore >= 80) {
      parts.push('RISCO CRÍTICO: ação imediata recomendada.');
    } else if (event.riskScore >= 60) {
      parts.push('Risco alto: monitoramento contínuo necessário.');
    }

    return parts.join(' ');
  }

  private calculateConfidence(events: GlobalEvent[], correlations: Correlation[]): number {
    let confidence = 50;

    if (events.length >= 10) confidence += 10;
    if (events.length >= 50) confidence += 10;

    if (correlations.length > 0) {
      const avgConfidence = correlations.reduce((s, c) => s + c.confidence, 0) / correlations.length;
      confidence += avgConfidence * 20;
    }

    return Math.min(95, Math.max(30, confidence));
  }

  private calculateExplanationConfidence(
    event: GlobalEvent,
    correlations: Correlation[]
  ): number {
    let confidence = 60;

    if (event.source !== 'simulation') confidence += 15;
    if (correlations.length > 0) confidence += 10;
    if (event.impact.magnitude || event.impact.fatalities) confidence += 10;

    return Math.min(95, Math.max(30, confidence));
  }

  private getCategoryLabel(category: EventCategory): string {
    const labels: Record<string, string> = {
      NATURAL_DISASTER: 'Desastres Naturais',
      CONFLICT: 'Conflitos',
      TECH_RISK: 'Riscos Tecnológicos',
      HEALTH: 'Saúde',
      TRANSPORT: 'Transporte',
    };
    return labels[category] || category;
  }

  private getSubTypeLabel(subType: EventSubType): string {
    const labels: Record<string, string> = {
      EARTHQUAKE: 'Terremoto',
      TSUNAMI: 'Tsunami',
      FLOOD: 'Enchente',
      WILDFIRE: 'Incêndio',
      HURRICANE: 'Furacão',
      STORM: 'Tempestade',
      VOLCANO: 'Vulcão',
      WAR: 'Guerra',
      TERRORISM: 'Terrorismo',
      CYBER_ATTACK: 'Ataque Cibernético',
      EPIDEMIC: 'Epidemia',
      PANDEMIC: 'Pandemia',
      LANDSLIDE: 'Deslizamento',
      HEAT_WAVE: 'Onda de Calor',
      BLIZZARD: 'Nevasca',
      TORNADO: 'Tornado',
      MISSILE_LAUNCH: 'Lançamento de Míssil',
      MILITARY_ATTACK: 'Ataque Militar',
      BOMBING: 'Bombardeio',
    };
    return labels[subType] || subType;
  }

  getCorrelationEngine(): CorrelationEngine {
    return this.correlationEngine;
  }

  getKnowledgeGraph(): KnowledgeGraph {
    return this.knowledgeGraph;
  }

  getEventHistory(): GlobalEvent[] {
    return [...this.eventHistory];
  }

  clear(): void {
    this.eventHistory = [];
    this.correlationEngine.clear();
    this.knowledgeGraph.clear();
  }
}
