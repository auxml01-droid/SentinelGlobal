import { GlobalEvent, EventCategory, EventSubType, RiskLevel, GeoPoint } from '@sentinel/types';

export type TimeRange = '5min' | '15min' | '1h' | '6h' | '24h' | '7d' | '30d';

export interface TimelineEvent {
  event: GlobalEvent;
  timelinePosition: number;
  cluster?: string;
}

export interface TimelineCluster {
  id: string;
  events: GlobalEvent[];
  centroid: GeoPoint;
  timeSpan: { start: string; end: string };
  dominantCategory: EventCategory;
  avgRiskScore: number;
  eventCount: number;
}

export interface TimelineStats {
  totalEvents: number;
  eventsByCategory: Record<EventCategory, number>;
  eventsBySubType: Record<EventSubType, number>;
  eventsByCountry: Record<string, number>;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timeline: Array<{
    timestamp: string;
    count: number;
    avgRisk: number;
  }>;
}

const TIME_RANGES: Record<TimeRange, number> = {
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export class TimelineEngine {
  private events: GlobalEvent[] = [];
  private maxEvents = 5000;

  addEvent(event: GlobalEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  addEvents(events: GlobalEvent[]): void {
    this.events.push(...events);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  getTimeline(range: TimeRange, options?: {
    category?: EventCategory;
    subType?: EventSubType;
    countryCode?: string;
    minRiskScore?: number;
  }): TimelineEvent[] {
    const now = Date.now();
    const rangeMs = TIME_RANGES[range];
    const cutoff = now - rangeMs;

    let filtered = this.events.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    );

    if (options?.category) {
      filtered = filtered.filter((e) => e.category === options.category);
    }

    if (options?.subType) {
      filtered = filtered.filter((e) => e.subType === options.subType);
    }

    if (options?.countryCode) {
      filtered = filtered.filter((e) => e.countryCode === options.countryCode);
    }

    if (options?.minRiskScore !== undefined) {
      filtered = filtered.filter((e) => e.riskScore >= options.minRiskScore!);
    }

    const sorted = filtered.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.map((event, index) => ({
      event,
      timelinePosition: index / Math.max(sorted.length - 1, 1),
    }));
  }

  getClusters(range: TimeRange, maxDistanceKm: number = 500): TimelineCluster[] {
    const now = Date.now();
    const rangeMs = TIME_RANGES[range];
    const cutoff = now - rangeMs;

    const filtered = this.events.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    );

    const sorted = [...filtered].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const clusters: TimelineCluster[] = [];
    const used = new Set<string>();

    for (const event of sorted) {
      if (used.has(event.id)) continue;

      const clusterEvents: GlobalEvent[] = [event];
      used.add(event.id);

      for (const other of sorted) {
        if (used.has(other.id)) continue;

        const distance = this.haversineDistance(event.location, other.location);
        const timeDiff = Math.abs(
          new Date(event.timestamp).getTime() - new Date(other.timestamp).getTime()
        );

        if (distance <= maxDistanceKm && timeDiff <= 6 * 60 * 60 * 1000) {
          clusterEvents.push(other);
          used.add(other.id);
        }
      }

      if (clusterEvents.length >= 2) {
        const centroid = this.calculateCentroid(
          clusterEvents.map((e) => e.location)
        );
        const avgRisk =
          clusterEvents.reduce((sum, e) => sum + e.riskScore, 0) /
          clusterEvents.length;

        clusters.push({
          id: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          events: clusterEvents,
          centroid,
          timeSpan: {
            start: clusterEvents[0].timestamp,
            end: clusterEvents[clusterEvents.length - 1].timestamp,
          },
          dominantCategory: this.getDominantCategory(clusterEvents),
          avgRiskScore: avgRisk,
          eventCount: clusterEvents.length,
        });
      }
    }

    return clusters.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }

  getStats(range: TimeRange): TimelineStats {
    const now = Date.now();
    const rangeMs = TIME_RANGES[range];
    const cutoff = now - rangeMs;

    const filtered = this.events.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    );

    const eventsByCategory: Record<string, number> = {
      NATURAL_DISASTER: 0,
      CONFLICT: 0,
      HEALTH: 0,
      TECH_RISK: 0,
      TRANSPORT: 0,
    };

    const eventsBySubType: Record<string, number> = {};
    const eventsByCountry: Record<string, number> = {};

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const event of filtered) {
      eventsByCategory[event.category]++;

      eventsBySubType[event.subType] = (eventsBySubType[event.subType] || 0) + 1;

      const country = event.countryCode || 'UNKNOWN';
      eventsByCountry[country] = (eventsByCountry[country] || 0) + 1;

      if (event.riskScore >= 80) critical++;
      else if (event.riskScore >= 60) high++;
      else if (event.riskScore >= 40) medium++;
      else low++;
    }

    const timeline = this.generateTimelineBuckets(filtered, range);

    return {
      totalEvents: filtered.length,
      eventsByCategory: eventsByCategory as Record<EventCategory, number>,
      eventsBySubType: eventsBySubType as Record<EventSubType, number>,
      eventsByCountry,
      riskDistribution: { critical, high, medium, low },
      timeline,
    };
  }

  private generateTimelineBuckets(
    events: GlobalEvent[],
    range: TimeRange
  ): Array<{ timestamp: string; count: number; avgRisk: number }> {
    const bucketCount = this.getBucketCount(range);
    const now = Date.now();
    const rangeMs = TIME_RANGES[range];
    const bucketSize = rangeMs / bucketCount;

    const buckets: Array<{ timestamp: string; count: number; avgRisk: number }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = now - rangeMs + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;

      const bucketEvents = events.filter((e) => {
        const time = new Date(e.timestamp).getTime();
        return time >= bucketStart && time < bucketEnd;
      });

      const count = bucketEvents.length;
      const avgRisk =
        count > 0
          ? bucketEvents.reduce((sum, e) => sum + e.riskScore, 0) / count
          : 0;

      buckets.push({
        timestamp: new Date(bucketStart).toISOString(),
        count,
        avgRisk,
      });
    }

    return buckets;
  }

  private getBucketCount(range: TimeRange): number {
    switch (range) {
      case '5min':
        return 10;
      case '15min':
        return 15;
      case '1h':
        return 12;
      case '6h':
        return 24;
      case '24h':
        return 24;
      case '7d':
        return 28;
      case '30d':
        return 30;
      default:
        return 24;
    }
  }

  private calculateCentroid(locations: GeoPoint[]): GeoPoint {
    const sum = locations.reduce(
      (acc, loc) => ({
        lat: acc.lat + loc.lat,
        lng: acc.lng + loc.lng,
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: sum.lat / locations.length,
      lng: sum.lng / locations.length,
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

  private haversineDistance(a: GeoPoint, b: GeoPoint): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }

  getEventById(eventId: string): GlobalEvent | undefined {
    return this.events.find((e) => e.id === eventId);
  }

  searchEvents(query: string): GlobalEvent[] {
    const lowerQuery = query.toLowerCase();
    return this.events.filter(
      (e) =>
        e.title.toLowerCase().includes(lowerQuery) ||
        e.description?.toLowerCase().includes(lowerQuery) ||
        e.locationName?.toLowerCase().includes(lowerQuery) ||
        e.countryCode?.toLowerCase().includes(lowerQuery)
    );
  }

  getRecentEvents(count: number = 50): GlobalEvent[] {
    return [...this.events]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, count);
  }

  clear(): void {
    this.events = [];
  }
}
