import { GlobalEvent, EventCategory, EventSubType, GeoPoint } from '@sentinel/types';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  weight: number;
  eventCount: number;
  avgRisk: number;
}

export interface HeatmapGrid {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  cellSize: number;
  points: HeatmapPoint[];
}

export interface Distribution {
  category: EventCategory;
  count: number;
  percentage: number;
  avgRisk: number;
  color: string;
}

export interface Trend {
  period: string;
  count: number;
  avgRisk: number;
  change: number;
  direction: 'up' | 'down' | 'stable';
}

export interface AnalyticsSummary {
  totalEvents: number;
  avgRiskScore: number;
  topCountries: Array<{ code: string; count: number; avgRisk: number }>;
  topEventTypes: Array<{ type: EventSubType; count: number }>;
  riskTrend: Trend[];
  categoryDistribution: Distribution[];
  heatmap: HeatmapGrid;
}

const CATEGORY_COLORS: Record<string, string> = {
  [EventCategory.NATURAL_DISASTER]: '#ef4444',
  [EventCategory.CONFLICT]: '#dc2626',
  [EventCategory.HEALTH]: '#f97316',
  [EventCategory.TECH_RISK]: '#eab308',
  [EventCategory.TRANSPORT]: '#84cc16',
};

export class AnalyticsEngine {
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

  generateHeatmap(
    bounds?: { north: number; south: number; east: number; west: number },
    cellSize: number = 2
  ): HeatmapGrid {
    const defaultBounds = {
      north: 90,
      south: -90,
      east: 180,
      west: -180,
    };

    const effectiveBounds = bounds || defaultBounds;
    const grid: Map<string, HeatmapPoint> = new Map();

    for (const event of this.events) {
      const cellLat = Math.floor(event.location.lat / cellSize) * cellSize;
      const cellLng = Math.floor(event.location.lng / cellSize) * cellSize;
      const key = `${cellLat},${cellLng}`;

      const existing = grid.get(key);
      if (existing) {
        existing.eventCount++;
        existing.weight += event.riskScore;
        existing.avgRisk = existing.weight / existing.eventCount;
        existing.intensity = Math.min(1, existing.eventCount / 10);
      } else {
        grid.set(key, {
          lat: cellLat + cellSize / 2,
          lng: cellLng + cellSize / 2,
          intensity: 0.1,
          weight: event.riskScore,
          eventCount: 1,
          avgRisk: event.riskScore,
        });
      }
    }

    return {
      bounds: effectiveBounds,
      cellSize,
      points: Array.from(grid.values()),
    };
  }

  getCategoryDistribution(): Distribution[] {
    const counts = new Map<string, { count: number; totalRisk: number }>();

    for (const event of this.events) {
      const existing = counts.get(event.category) || { count: 0, totalRisk: 0 };
      existing.count++;
      existing.totalRisk += event.riskScore;
      counts.set(event.category, existing);
    }

    const total = this.events.length;
    const distributions: Distribution[] = [];

    for (const [category, data] of counts) {
      distributions.push({
        category: category as EventCategory,
        count: data.count,
        percentage: total > 0 ? (data.count / total) * 100 : 0,
        avgRisk: data.count > 0 ? data.totalRisk / data.count : 0,
        color: CATEGORY_COLORS[category as EventCategory] || '#6b7280',
      });
    }

    return distributions.sort((a, b) => b.count - a.count);
  }

  getRiskTrend(hours: number = 24): Trend[] {
    const now = Date.now();
    const bucketCount = 24;
    const bucketSize = (hours * 60 * 60 * 1000) / bucketCount;
    const trends: Trend[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = now - hours * 60 * 60 * 1000 + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;

      const bucketEvents = this.events.filter((e) => {
        const time = new Date(e.timestamp).getTime();
        return time >= bucketStart && time < bucketEnd;
      });

      const count = bucketEvents.length;
      const avgRisk =
        count > 0
          ? bucketEvents.reduce((sum, e) => sum + e.riskScore, 0) / count
          : 0;

      let prevAvgRisk = 0;
      if (i > 0) {
        const prevStart = bucketStart - bucketSize;
        const prevEnd = bucketStart;
        const prevEvents = this.events.filter((e) => {
          const time = new Date(e.timestamp).getTime();
          return time >= prevStart && time < prevEnd;
        });
        prevAvgRisk =
          prevEvents.length > 0
            ? prevEvents.reduce((sum, e) => sum + e.riskScore, 0) /
              prevEvents.length
            : 0;
      }

      const change = prevAvgRisk > 0 ? ((avgRisk - prevAvgRisk) / prevAvgRisk) * 100 : 0;
      const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';

      trends.push({
        period: new Date(bucketStart).toISOString(),
        count,
        avgRisk,
        change,
        direction,
      });
    }

    return trends;
  }

  getTopCountries(limit: number = 10): Array<{ code: string; count: number; avgRisk: number }> {
    const countryStats = new Map<string, { count: number; totalRisk: number }>();

    for (const event of this.events) {
      const code = event.countryCode || 'UNKNOWN';
      const existing = countryStats.get(code) || { count: 0, totalRisk: 0 };
      existing.count++;
      existing.totalRisk += event.riskScore;
      countryStats.set(code, existing);
    }

    return Array.from(countryStats.entries())
      .map(([code, data]) => ({
        code,
        count: data.count,
        avgRisk: data.count > 0 ? data.totalRisk / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getTopEventTypes(limit: number = 10): Array<{ type: EventSubType; count: number }> {
    const typeCounts = new Map<EventSubType, number>();

    for (const event of this.events) {
      typeCounts.set(event.subType, (typeCounts.get(event.subType) || 0) + 1);
    }

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getSummary(): AnalyticsSummary {
    const totalEvents = this.events.length;
    const avgRiskScore =
      totalEvents > 0
        ? this.events.reduce((sum, e) => sum + e.riskScore, 0) / totalEvents
        : 0;

    return {
      totalEvents,
      avgRiskScore,
      topCountries: this.getTopCountries(),
      topEventTypes: this.getTopEventTypes(),
      riskTrend: this.getRiskTrend(),
      categoryDistribution: this.getCategoryDistribution(),
      heatmap: this.generateHeatmap(),
    };
  }

  getEventFrequencyByHour(): Array<{ hour: number; count: number }> {
    const hourCounts = new Array(24).fill(0);

    for (const event of this.events) {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    }

    return hourCounts.map((count, hour) => ({ hour, count }));
  }

  getEventFrequencyByDay(): Array<{ day: string; count: number }> {
    const dayCounts = new Map<string, number>();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (const event of this.events) {
      const dayIndex = new Date(event.timestamp).getDay();
      const dayName = days[dayIndex];
      dayCounts.set(dayName, (dayCounts.get(dayName) || 0) + 1);
    }

    return days.map((day) => ({
      day,
      count: dayCounts.get(day) || 0,
    }));
  }

  getRiskDistribution(): {
    critical: number;
    high: number;
    medium: number;
    low: number;
    minimal: number;
  } {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let minimal = 0;

    for (const event of this.events) {
      if (event.riskScore >= 80) critical++;
      else if (event.riskScore >= 60) high++;
      else if (event.riskScore >= 40) medium++;
      else if (event.riskScore >= 20) low++;
      else minimal++;
    }

    return { critical, high, medium, low, minimal };
  }

  getAverageMetrics(): {
    avgRiskScore: number;
    avgMagnitude: number;
    avgAffectedArea: number;
    totalFatalities: number;
  } {
    let totalRisk = 0;
    let totalMagnitude = 0;
    let magnitudeCount = 0;
    let totalAffectedArea = 0;
    let totalFatalities = 0;

    for (const event of this.events) {
      totalRisk += event.riskScore;

      if (event.impact?.magnitude) {
        totalMagnitude += event.impact.magnitude;
        magnitudeCount++;
      }

      if (event.impact?.affectedArea) {
        totalAffectedArea += event.impact.affectedArea;
      }

      if (event.impact?.fatalities) {
        totalFatalities += event.impact.fatalities;
      }
    }

    const total = this.events.length;

    return {
      avgRiskScore: total > 0 ? totalRisk / total : 0,
      avgMagnitude: magnitudeCount > 0 ? totalMagnitude / magnitudeCount : 0,
      avgAffectedArea: total > 0 ? totalAffectedArea / total : 0,
      totalFatalities,
    };
  }

  clear(): void {
    this.events = [];
  }
}
