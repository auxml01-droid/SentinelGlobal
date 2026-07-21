import { GlobalEvent, EventStatus, RiskLevel } from '@sentinel/types';
import { scoreToRiskLevel } from '@sentinel/shared';
import { WeightedScorer, CountryWeights } from './weighted-scorer';
import { EventLifecycleManager } from './lifecycle-manager';
import { EngineConfig, CountryRiskCalc, RiskCalculationResult, CountryEventHistory } from './types';

const DEFAULT_CONFIG: EngineConfig = {
  updateIntervalMs: 5000,
  countryScoreDecayMs: 3600000,
  maxHistoricalEvents: 50000,
  scoreWeights: {
    magnitude: 0.25,
    population: 0.20,
    infrastructure: 0.15,
    history: 0.20,
    aiConfidence: 0.20,
  },
};

export class RiskEngine {
  private events: GlobalEvent[] = [];
  private config: EngineConfig;
  private scorer: WeightedScorer;
  private lifecycleManager: EventLifecycleManager;
  private countryHistory: Map<string, CountryEventHistory> = new Map();

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scorer = new WeightedScorer(this.config.scoreWeights!);
    this.lifecycleManager = new EventLifecycleManager();
  }

  ingestEvent(event: GlobalEvent): void {
    const existing = this.events.findIndex((e) => e.id === event.id);

    if (existing >= 0) {
      const old = this.events[existing]!;
      const now = new Date().toISOString();
      this.events[existing] = {
        ...event,
        status: EventStatus.UPDATED,
        updatedAt: now,
        lifecycle: { ...old.lifecycle, updated: now },
      };
    } else {
      event.status = EventStatus.CREATED;
      event.lifecycle = this.lifecycleManager.initLifecycle();
      this.events.push(event);
    }

    this.updateCountryHistory(event);
    const scoredEvent = this.scorer.scoreEvent(event);
    Object.assign(event, scoredEvent);

    if (this.events.length > this.config.maxHistoricalEvents) {
      this.events = this.events.slice(-this.config.maxHistoricalEvents);
    }
  }

  ingestEvents(events: GlobalEvent[]): void {
    for (const event of events) {
      this.ingestEvent(event);
    }
  }

  resolveEvent(eventId: string): GlobalEvent | undefined {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      const now = new Date().toISOString();
      event.status = EventStatus.RESOLVED;
      event.updatedAt = now;
      event.lifecycle.resolved = now;
    }
    return event;
  }

  archiveEvent(eventId: string): GlobalEvent | undefined {
    const event = this.events.find((e) => e.id === eventId);
    if (event) {
      const now = new Date().toISOString();
      event.status = EventStatus.ARCHIVED;
      event.updatedAt = now;
      event.lifecycle.archived = now;
    }
    return event;
  }

  expireEvents(maxAgeMs: number = 86400000): GlobalEvent[] {
    const now = Date.now();
    const expired: GlobalEvent[] = [];
    for (const event of this.events) {
      if (event.status === EventStatus.ARCHIVED || event.status === EventStatus.EXPIRED) continue;
      const age = now - new Date(event.timestamp).getTime();
      if (age > maxAgeMs) {
        event.status = EventStatus.EXPIRED;
        event.updatedAt = new Date().toISOString();
        event.lifecycle.expired = event.updatedAt;
        expired.push(event);
      }
    }
    return expired;
  }

  calculate(): RiskCalculationResult {
    const now = Date.now();
    const cutoff = now - this.config.countryScoreDecayMs;
    const activeEvents = this.events.filter(
      (e) => e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED,
    );
    const recentEvents = this.events.filter(
      (e) => new Date(e.timestamp).getTime() > cutoff || e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED,
    );

    const countryGroups = new Map<string, GlobalEvent[]>();

    for (const event of recentEvents) {
      const code = event.countryCode ?? 'XX';
      const group = countryGroups.get(code) ?? [];
      group.push(event);
      countryGroups.set(code, group);
    }

    const countries: CountryRiskCalc[] = [];

    for (const [countryCode, countryEvents] of countryGroups) {
      const scores = countryEvents.map((e) => e.riskScore);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      const topScore = scores.length > 0 ? Math.max(...scores) : 0;

      const score = Math.round(avgScore * 0.6 + topScore * 0.4);
      const level = this.scoreToLevel(score);

      const previous = this.countryHistory.get(countryCode);
      const trend = previous
        ? score > previous.lastScore ? 'up' as const
          : score < previous.lastScore ? 'down' as const
          : 'stable' as const
        : 'stable' as const;

      this.countryHistory.set(countryCode, { lastScore: score, lastUpdated: now });

      const topEvents = countryEvents
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5)
        .map((e) => e.id);

      countries.push({
        countryCode,
        events: countryEvents,
        score,
        level,
        trend,
        topEventIds: topEvents,
      });
    }

    const allScores = countries.map((c) => c.score);
    const globalScore = allScores.length > 0
      ? Math.round((allScores.sort((a, b) => b - a).slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(allScores.length, 10)) * 0.7
        + (allScores.reduce((a, b) => a + b, 0) / allScores.length) * 0.3)
      : 0;

    const globalLevel = this.scoreToLevel(globalScore);

    return {
      globalScore,
      globalLevel,
      countries,
      updatedAt: new Date().toISOString(),
      eventCount: activeEvents.length,
      totalEvents: this.events.length,
    };
  }

  getEvents(filters?: {
    country?: string;
    category?: string;
    status?: string;
    limit?: number;
  }): GlobalEvent[] {
    let result = this.events;

    if (filters?.country) {
      result = result.filter((e) => e.countryCode === filters.country);
    }
    if (filters?.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters?.status) {
      result = result.filter((e) => e.status === filters.status);
    }

    return result
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, filters?.limit ?? 1000);
  }

  getStats(): {
    total: number;
    active: number;
    byCategory: Record<string, number>;
    byCountry: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const event of this.events) {
      byCategory[event.category] = (byCategory[event.category] ?? 0) + 1;
      const code = event.countryCode ?? 'XX';
      byCountry[code] = (byCountry[code] ?? 0) + 1;
      byStatus[event.status] = (byStatus[event.status] ?? 0) + 1;
    }

    return {
      total: this.events.length,
      active: this.events.filter((e) => e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED).length,
      byCategory,
      byCountry,
      byStatus,
    };
  }

  query(options: {
    country?: string;
    category?: string;
    minScore?: number;
    maxScore?: number;
    status?: EventStatus;
    since?: string;
    limit?: number;
  }): GlobalEvent[] {
    let result = this.events;

    if (options.country) result = result.filter((e) => e.countryCode === options.country);
    if (options.category) result = result.filter((e) => e.category === options.category);
    if (options.minScore !== undefined) result = result.filter((e) => e.riskScore >= options.minScore!);
    if (options.maxScore !== undefined) result = result.filter((e) => e.riskScore <= options.maxScore!);
    if (options.status) result = result.filter((e) => e.status === options.status);
    if (options.since) result = result.filter((e) => new Date(e.timestamp) >= new Date(options.since!));

    return result.sort((a, b) => b.riskScore - a.riskScore).slice(0, options.limit ?? 100);
  }

  private updateCountryHistory(event: GlobalEvent): void {
    const code = event.countryCode ?? 'XX';
    const existing = this.countryHistory.get(code);
    if (existing) {
      existing.lastScore = event.riskScore;
      existing.lastUpdated = Date.now();
    } else {
      this.countryHistory.set(code, { lastScore: event.riskScore, lastUpdated: Date.now() });
    }
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICO;
    if (score >= 60) return RiskLevel.ALTO_RISCO;
    if (score >= 40) return RiskLevel.ALERTA;
    if (score >= 20) return RiskLevel.ATENCAO;
    return RiskLevel.NORMAL;
  }

  reset(): void {
    this.events = [];
    this.countryHistory.clear();
  }
}
