import { GlobalEvent, AIAnalysis, AIQuery, AIResponse, EventCategory, EventSubType, EventStatus, CountryRiskScore } from '@sentinel/types';
import { CentralAgent } from './central-agent.js';
import { RiskEngine } from '@sentinel/risk-engine';

export class AIAnalyzer {
  private centralAgent: CentralAgent;
  private riskEngine?: RiskEngine;
  private lastAnalysis: AIAnalysis[] = [];
  private analysisHistory: AIAnalysis[] = [];
  private lastRun: number = 0;
  private readonly MIN_INTERVAL = 60000;

  constructor(riskEngine?: RiskEngine) {
    this.centralAgent = new CentralAgent();
    this.riskEngine = riskEngine;
  }

  setRiskEngine(engine: RiskEngine): void {
    this.riskEngine = engine;
  }

  async runAnalysis(events: GlobalEvent[]): Promise<AIAnalysis[]> {
    const now = Date.now();
    if (now - this.lastRun < this.MIN_INTERVAL && this.lastAnalysis.length > 0) {
      return this.lastAnalysis;
    }
    this.lastRun = now;

    try {
      const result = await this.centralAgent.analyzeAll(events);

      this.lastAnalysis = [
        ...result.predictions,
        ...this.buildContextualAnalyses(events),
      ];

      if (result.summary) {
        this.lastAnalysis.unshift({
          id: `central-${Date.now()}`,
          agentType: 'central' as any,
          title: 'Análise Global',
          summary: result.globalAssessment,
          confidence: 85,
          relatedEvents: [],
          timestamp: new Date().toISOString(),
        });
      }

      this.analysisHistory.push(...this.lastAnalysis);
      if (this.analysisHistory.length > 100) {
        this.analysisHistory = this.analysisHistory.slice(-100);
      }

      return this.lastAnalysis;
    } catch (error) {
      console.error('Erro na análise de IA:', error);
      return [];
    }
  }

  private buildContextualAnalyses(events: GlobalEvent[]): AIAnalysis[] {
    const analyses: AIAnalysis[] = [];

    const byCategory = this.groupByCategory(events);
    const changes = this.detectChanges(events);

    if (changes.length > 0) {
      analyses.push({
        id: `trend-${Date.now()}`,
        agentType: 'prediction' as any,
        title: 'Tendências detectadas',
        summary: changes.join(' '),
        confidence: 70,
        predictions: [],
        recommendations: ['Manter monitoramento'],
        relatedEvents: [],
        timestamp: new Date().toISOString(),
      });
    }

    for (const [cat, catEvents] of byCategory) {
      if (catEvents.length < 2) continue;

      const highRisk = catEvents.filter((e) => e.riskScore >= 60);
      if (highRisk.length > 0) {
        analyses.push({
          id: `cat-${cat}-${Date.now()}`,
          agentType: 'news' as any,
          title: `${this.getCategoryLabel(cat)}: ${highRisk.length} evento(s) de alto risco`,
          summary: `Dos ${catEvents.length} eventos monitorados, ${highRisk.length} estão em nível crítico. Recomenda-se atenção redobrada.`,
          confidence: 75,
          relatedEvents: highRisk.slice(0, 5).map((e) => e.id),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return analyses;
  }

  private groupByCategory(events: GlobalEvent[]): Map<string, GlobalEvent[]> {
    const map = new Map<string, GlobalEvent[]>();
    for (const event of events) {
      const group = map.get(event.category) ?? [];
      group.push(event);
      map.set(event.category, group);
    }
    return map;
  }

  private detectChanges(events: GlobalEvent[]): string[] {
    const changes: string[] = [];
    const now = Date.now();
    const recentEvents = events.filter(
      (e) => now - new Date(e.timestamp).getTime() < 3600000,
    );

    if (recentEvents.length > 10) {
      changes.push(`Alta atividade nas últimas 1h: ${recentEvents.length} eventos registrados.`);
    }

    const quakes = recentEvents.filter(
      (e) => e.subType === EventSubType.EARTHQUAKE && (e.impact.magnitude ?? 0) >= 5,
    );
    if (quakes.length >= 3) {
      changes.push(`Aumento de atividade sísmica: ${quakes.length} terremotos ≥ M5.0 na última hora.`);
    }

    return changes;
  }

  async answerQuery(query: AIQuery): Promise<AIResponse> {
    const q = query.query.toLowerCase();
    const events = this.riskEngine?.getEvents() ?? [];

    if (q.includes('risco geopolítico') || q.includes('maior risco')) {
      return this.answerGeopoliticalRisk(events);
    }
    if (q.includes('tsunami') || (q.includes('terremoto') && q.includes('pacífico'))) {
      return this.answerTsunamiRisk(events);
    }
    if (q.includes('magnitude') || q.includes('terremotos')) {
      return this.answerEarthquakeQuery(events, q);
    }
    if (q.includes('comparar') || q.includes('média')) {
      return this.answerComparisonQuery(events, q);
    }
    if (q.includes('incêndio') || q.includes('wildfire') || q.includes('fire')) {
      return this.answerFireQuery(events);
    }

    return this.answerGeneric(events, q);
  }

  private answerGeopoliticalRisk(events: GlobalEvent[]): AIResponse {
    const conflicts = events.filter(
      (e) =>
        e.category === EventCategory.CONFLICT &&
        e.status === EventStatus.CREATED,
    );

    const byCountry = new Map<string, number>();
    for (const c of conflicts) {
      const code = c.countryCode ?? 'XX';
      byCountry.set(code, (byCountry.get(code) ?? 0) + 1);
    }

    const sorted = Array.from(byCountry.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCountries = sorted.map(([code, count]) => `${code} (${count} eventos)`).join(', ');

    return {
      answer: `Análise geopolítica: ${conflicts.length} eventos de conflito ativos. ${sorted.length > 0 ? `Países com maior atividade: ${topCountries}.` : 'Nenhum foco de tensão elevada no momento.'}`,
      sources: events.slice(0, 3).map((e) => e.id),
      confidence: 75,
    };
  }

  private answerTsunamiRisk(events: GlobalEvent[]): AIResponse {
    const quakes = events.filter(
      (e) =>
        e.subType === EventSubType.EARTHQUAKE &&
        (e.impact.magnitude ?? 0) >= 6.5 &&
        new Date().getTime() - new Date(e.timestamp).getTime() < 7200000,
    );

    const recentCount = quakes.length;
    const probability = Math.min(recentCount * 12, 60);

    return {
      answer: `Análise de risco de tsunami: ${recentCount} terremoto(s) de alta magnitude nas últimas 2 horas. Probabilidade estimada de tsunami: ${probability}%. ${probability > 30 ? 'Recomenda-se monitoramento contínuo das regiões costeiras do Pacífico.' : 'Risco dentro dos parâmetros normais.'}`,
      sources: quakes.slice(0, 3).map((e) => e.id),
      confidence: 70,
    };
  }

  private answerEarthquakeQuery(events: GlobalEvent[], query: string): AIResponse {
    const minMag = parseFloat(query.match(/magnitude\s*([\d.]+)/i)?.[1] ?? '0') || 6;
    const quakes = events.filter(
      (e) =>
        e.subType === EventSubType.EARTHQUAKE &&
        (e.impact.magnitude ?? 0) >= minMag &&
        e.status === EventStatus.CREATED,
    );

    return {
      answer: quakes.length > 0
        ? `Encontrados ${quakes.length} terremotos acima de M${minMag}: ${quakes.map((e) => `${e.title} [${e.riskScore}%]`).join('; ')}`
        : `Nenhum terremoto acima de M${minMag} registrado no momento.`,
      sources: quakes.map((e) => e.id),
      confidence: 85,
    };
  }

  private answerFireQuery(events: GlobalEvent[]): AIResponse {
    const fires = events.filter((e) => e.subType === EventSubType.WILDFIRE && (e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED));
    const byCountry = new Map<string, number>();
    for (const f of fires) {
      const code = f.countryCode ?? 'XX';
      byCountry.set(code, (byCountry.get(code) ?? 0) + 1);
    }
    const sorted = Array.from(byCountry.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return {
      answer: `Incêndios florestais: ${fires.length} focos ativos. ${sorted.map(([c, n]) => `${c}: ${n}`).join(', ')}`,
      sources: fires.slice(0, 3).map((e) => e.id),
      confidence: 80,
    };
  }

  private answerComparisonQuery(events: GlobalEvent[], query: string): AIResponse {
    const countryMatch = query.match(/do\s+(\w+)/i);
    const country = countryMatch?.[1]?.toUpperCase() ?? 'JP';

    const countryEvents = events.filter((e) => e.countryCode === country && e.subType === EventSubType.EARTHQUAKE);
    const allQuakes = events.filter((e) => e.subType === EventSubType.EARTHQUAKE);

    const countryAvg = countryEvents.reduce((s, e) => s + (e.impact.magnitude ?? 0), 0) / Math.max(countryEvents.length, 1);
    const globalAvg = allQuakes.reduce((s, e) => s + (e.impact.magnitude ?? 0), 0) / Math.max(allQuakes.length, 1);

    return {
      answer: `Análise comparativa: ${country} registrou ${countryEvents.length} terremotos (média M${countryAvg.toFixed(1)}). A média global é M${globalAvg.toFixed(1)}. ${countryAvg > globalAvg ? `A atividade sísmica em ${country} está ${(((countryAvg - globalAvg) / globalAvg) * 100).toFixed(0)}% acima da média global.` : `A atividade em ${country} está dentro ou abaixo da média global.`}`,
      sources: [...countryEvents.slice(0, 3), ...allQuakes.slice(0, 2)].map((e) => e.id),
      confidence: 78,
    };
  }

  private answerGeneric(events: GlobalEvent[], query: string): AIResponse {
    const total = events.length;
    const active = events.filter((e) => e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED).length;
    const highRisk = events.filter((e) => e.riskScore >= 60).length;

    return {
      answer: `Análise geral do SentinelGlobal: ${total} eventos monitorados, ${active} ativos, ${highRisk} em nível de alto risco ou superior. ${highRisk > 5 ? 'Recomenda-se atenção máxima.' : 'Situação global sob monitoramento.'}`,
      sources: events.slice(0, 3).map((e) => e.id),
      confidence: 80,
    };
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      [EventCategory.NATURAL_DISASTER]: 'Desastres Naturais',
      [EventCategory.CONFLICT]: 'Conflitos',
      [EventCategory.TECH_RISK]: 'Riscos Tecnológicos',
      [EventCategory.HEALTH]: 'Saúde',
      [EventCategory.TRANSPORT]: 'Transporte',
    };
    return labels[category] ?? category;
  }

  getLatest(): AIAnalysis[] {
    return this.lastAnalysis;
  }

  getHistory(): AIAnalysis[] {
    return this.analysisHistory;
  }
}
