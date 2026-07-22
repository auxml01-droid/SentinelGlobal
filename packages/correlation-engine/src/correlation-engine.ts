import { GlobalEvent, EventCategory, EventSubType, GeoPoint } from '@sentinel/types';

export interface Correlation {
  id: string;
  primaryEventId: string;
  relatedEventIds: string[];
  correlationType: 'cascade' | 'spatial' | 'temporal' | 'thematic';
  confidence: number;
  description: string;
  createdAt: string;
}

export interface CorrelationCluster {
  id: string;
  events: GlobalEvent[];
  centroid: GeoPoint;
  avgRiskScore: number;
  dominantCategory: EventCategory;
  timeSpan: { start: string; end: string };
  correlationCount: number;
}

export interface CorrelationConfig {
  spatialRadiusKm: number;
  temporalWindowMinutes: number;
  cascadeRules: CascadeRule[];
}

export interface CascadeRule {
  trigger: EventSubType;
  effects: EventSubType[];
  maxDelayMinutes: number;
  confidence: number;
}

const DEFAULT_CONFIG: CorrelationConfig = {
  spatialRadiusKm: 500,
  temporalWindowMinutes: 60,
  cascadeRules: [
    { trigger: EventSubType.EARTHQUAKE, effects: [EventSubType.TSUNAMI, EventSubType.FLOOD], maxDelayMinutes: 30, confidence: 0.8 },
    { trigger: EventSubType.VOLCANO, effects: [EventSubType.STORM, EventSubType.EARTHQUAKE], maxDelayMinutes: 120, confidence: 0.6 },
    { trigger: EventSubType.HURRICANE, effects: [EventSubType.FLOOD, EventSubType.STORM], maxDelayMinutes: 60, confidence: 0.7 },
    { trigger: EventSubType.FLOOD, effects: [EventSubType.STORM], maxDelayMinutes: 120, confidence: 0.5 },
  ],
};

export class CorrelationEngine {
  private config: CorrelationConfig;
  private correlations: Map<string, Correlation> = new Map();
  private clusters: Map<string, CorrelationCluster> = new Map();
  private eventBuffer: GlobalEvent[] = [];
  private maxBufferSize = 1000;

  constructor(config?: Partial<CorrelationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  processEvent(event: GlobalEvent): Correlation[] {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }

    const newCorrelations: Correlation[] = [];

    const cascadeCorrelations = this.detectCascadeCorrelations(event);
    newCorrelations.push(...cascadeCorrelations);

    const spatialCorrelations = this.detectSpatialCorrelations(event);
    newCorrelations.push(...spatialCorrelations);

    const temporalCorrelations = this.detectTemporalCorrelations(event);
    newCorrelations.push(...temporalCorrelations);

    const thematicCorrelations = this.detectThematicCorrelations(event);
    newCorrelations.push(...thematicCorrelations);

    for (const corr of newCorrelations) {
      this.correlations.set(corr.id, corr);
    }

    this.updateClusters(event);

    return newCorrelations;
  }

  private detectCascadeCorrelations(event: GlobalEvent): Correlation[] {
    const correlations: Correlation[] = [];

    for (const rule of this.config.cascadeRules) {
      if (event.subType === rule.trigger) {
        const windowMs = rule.maxDelayMinutes * 60 * 1000;
        const cutoff = new Date(event.timestamp).getTime() - windowMs;

        const potentialEffects = this.eventBuffer.filter(
          (e) =>
            e.id !== event.id &&
            rule.effects.includes(e.subType) &&
            new Date(e.timestamp).getTime() >= cutoff &&
            new Date(e.timestamp).getTime() <= new Date(event.timestamp).getTime()
        );

        for (const effect of potentialEffects) {
          const distance = this.haversineDistance(event.location, effect.location);
          if (distance <= this.config.spatialRadiusKm) {
            const timeDiffMinutes = (new Date(effect.timestamp).getTime() - new Date(event.timestamp).getTime()) / 60000;
            const confidence = rule.confidence * (1 - Math.abs(timeDiffMinutes) / rule.maxDelayMinutes);

            correlations.push({
              id: `cascade-${event.id}-${effect.id}`,
              primaryEventId: event.id,
              relatedEventIds: [effect.id],
              correlationType: 'cascade',
              confidence: Math.max(0, Math.min(1, confidence)),
              description: `${this.getSubTypeLabel(event.subType)} pode ter causado ${this.getSubTypeLabel(effect.subType)}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return correlations;
  }

  private detectSpatialCorrelations(event: GlobalEvent): Correlation[] {
    const correlations: Correlation[] = [];
    const timeWindowMs = this.config.temporalWindowMinutes * 60 * 1000;
    const cutoff = new Date(event.timestamp).getTime() - timeWindowMs;

    const nearbyEvents = this.eventBuffer.filter(
      (e) =>
        e.id !== event.id &&
        new Date(e.timestamp).getTime() >= cutoff &&
        this.haversineDistance(event.location, e.location) <= this.config.spatialRadiusKm
    );

    for (const nearby of nearbyEvents) {
      const distance = this.haversineDistance(event.location, nearby.location);
      const timeDiffMinutes = Math.abs(new Date(event.timestamp).getTime() - new Date(nearby.timestamp).getTime()) / 60000;
      const distanceScore = 1 - distance / this.config.spatialRadiusKm;
      const timeScore = 1 - timeDiffMinutes / this.config.temporalWindowMinutes;
      const confidence = (distanceScore * 0.6 + timeScore * 0.4);

      if (confidence > 0.3) {
        correlations.push({
          id: `spatial-${event.id}-${nearby.id}`,
          primaryEventId: event.id,
          relatedEventIds: [nearby.id],
          correlationType: 'spatial',
          confidence,
          description: `Eventos na mesma região (~${Math.round(distance)}km)`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return correlations;
  }

  private detectTemporalCorrelations(event: GlobalEvent): Correlation[] {
    const correlations: Correlation[] = [];
    const timeWindowMs = 30 * 60 * 1000;

    const recentEvents = this.eventBuffer.filter(
      (e) =>
        e.id !== event.id &&
        e.subType === event.subType &&
        Math.abs(new Date(event.timestamp).getTime() - new Date(e.timestamp).getTime()) <= timeWindowMs
    );

    if (recentEvents.length > 0) {
      const confidence = Math.min(1, 0.3 + recentEvents.length * 0.1);
      correlations.push({
        id: `temporal-${event.id}-${recentEvents.map((e) => e.id).join('-')}`,
        primaryEventId: event.id,
        relatedEventIds: recentEvents.map((e) => e.id),
        correlationType: 'temporal',
        confidence,
        description: `${recentEvents.length + 1} eventos do mesmo tipo em curto período`,
        createdAt: new Date().toISOString(),
      });
    }

    return correlations;
  }

  private detectThematicCorrelations(event: GlobalEvent): Correlation[] {
    const correlations: Correlation[] = [];

    const relatedCategories: Partial<Record<EventCategory, EventCategory[]>> = {
      [EventCategory.NATURAL_DISASTER]: [EventCategory.HEALTH],
      [EventCategory.CONFLICT]: [EventCategory.TECH_RISK],
      [EventCategory.HEALTH]: [EventCategory.NATURAL_DISASTER],
      [EventCategory.TECH_RISK]: [EventCategory.CONFLICT],
      [EventCategory.TRANSPORT]: [EventCategory.CONFLICT],
    };

    const relatedTypes: EventSubType[] = [];
    const mapping = relatedCategories[event.category];
    if (mapping) {
      const timeWindowMs = 60 * 60 * 1000;
      const cutoff = new Date(event.timestamp).getTime() - timeWindowMs;

      const thematicEvents = this.eventBuffer.filter(
        (e) =>
          e.id !== event.id &&
          mapping.includes(e.category) &&
          new Date(e.timestamp).getTime() >= cutoff &&
          this.haversineDistance(event.location, e.location) <= this.config.spatialRadiusKm * 2
      );

      if (thematicEvents.length > 0) {
        correlations.push({
          id: `thematic-${event.id}`,
          primaryEventId: event.id,
          relatedEventIds: thematicEvents.map((e) => e.id),
          correlationType: 'thematic',
          confidence: 0.4,
          description: `Eventos de categorias relacionadas na mesma região`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return correlations;
  }

  private updateClusters(event: GlobalEvent): void {
    let addedToCluster = false;

    for (const [clusterId, cluster] of this.clusters) {
      const distance = this.haversineDistance(event.location, cluster.centroid);
      const timeDiff = Math.abs(new Date(event.timestamp).getTime() - new Date(cluster.timeSpan.end).getTime()) / 60000;

      if (distance <= this.config.spatialRadiusKm && timeDiff <= this.config.temporalWindowMinutes * 3) {
        cluster.events.push(event);
        cluster.correlationCount++;
        cluster.avgRiskScore = cluster.events.reduce((sum, e) => sum + e.riskScore, 0) / cluster.events.length;
        cluster.timeSpan.end = event.timestamp;
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      const newCluster: CorrelationCluster = {
        id: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        events: [event],
        centroid: { ...event.location },
        avgRiskScore: event.riskScore,
        dominantCategory: event.category,
        timeSpan: { start: event.timestamp, end: event.timestamp },
        correlationCount: 0,
      };
      this.clusters.set(newCluster.id, newCluster);
    }
  }

  private haversineDistance(a: GeoPoint, b: GeoPoint): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
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
    };
    return labels[subType] || subType;
  }

  getCorrelations(): Correlation[] {
    return Array.from(this.correlations.values());
  }

  getCorrelationsForEvent(eventId: string): Correlation[] {
    return Array.from(this.correlations.values()).filter(
      (c) => c.primaryEventId === eventId || c.relatedEventIds.includes(eventId)
    );
  }

  getClusters(): CorrelationCluster[] {
    return Array.from(this.clusters.values());
  }

  getCluster(clusterId: string): CorrelationCluster | undefined {
    return this.clusters.get(clusterId);
  }

  getStats(): {
    totalCorrelations: number;
    totalClusters: number;
    byType: Record<string, number>;
    avgConfidence: number;
  } {
    const correlations = Array.from(this.correlations.values());
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const corr of correlations) {
      byType[corr.correlationType] = (byType[corr.correlationType] || 0) + 1;
      totalConfidence += corr.confidence;
    }

    return {
      totalCorrelations: correlations.length,
      totalClusters: this.clusters.size,
      byType,
      avgConfidence: correlations.length > 0 ? totalConfidence / correlations.length : 0,
    };
  }

  clear(): void {
    this.correlations.clear();
    this.clusters.clear();
    this.eventBuffer = [];
  }
}
