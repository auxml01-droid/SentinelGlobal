import { Injectable } from '@nestjs/common';
import { GlobalEvent, EventCategory } from '@sentinel/types';
import { EventsService } from '../events/events.service';

export interface TimelinePoint {
  timestamp: string;
  score: number;
  eventCount: number;
  events: { category: string; count: number }[];
}

@Injectable()
export class HistoryService {
  constructor(private readonly eventsService: EventsService) {}

  getTimeline(rangeMinutes: number): TimelinePoint[] {
    const events = this.eventsService.findAll({ limit: 1000 });
    const cutoff = Date.now() - rangeMinutes * 60 * 1000;
    const filtered = events.filter(
      (e) => new Date(e.timestamp).getTime() > cutoff,
    );

    const pointCount = Math.min(filtered.length, 20);
    if (pointCount === 0) return [];

    const interval = rangeMinutes / pointCount;
    const points: TimelinePoint[] = [];

    for (let i = 0; i < pointCount; i++) {
      const start = cutoff + i * interval * 60 * 1000;
      const end = start + interval * 60 * 1000;
      const slice = filtered.filter((e) => {
        const t = new Date(e.timestamp).getTime();
        return t >= start && t < end;
      });

      const byCategory = new Map<string, number>();
      for (const event of slice) {
        byCategory.set(event.category, (byCategory.get(event.category) ?? 0) + 1);
      }

      points.push({
        timestamp: new Date(start).toISOString(),
        score: Math.round(
          slice.reduce((s, e) => s + e.riskScore, 0) / Math.max(slice.length, 1),
        ),
        eventCount: slice.length,
        events: Array.from(byCategory.entries()).map(([category, count]) => ({
          category,
          count,
        })),
      });
    }

    return points;
  }

  getCountryHistory(countryCode: string, rangeMinutes: number): GlobalEvent[] {
    return this.eventsService
      .findAll({ countryCode, limit: 500 })
      .filter((e) => new Date(e.timestamp).getTime() > Date.now() - rangeMinutes * 60 * 1000)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  getStats(): {
    byCategory: Record<string, number>;
    byCountry: Record<string, number>;
    total: number;
  } {
    const events = this.eventsService.findAll();
    const byCategory: Record<string, number> = {};
    const byCountry: Record<string, number> = {};

    for (const event of events) {
      byCategory[event.category] = (byCategory[event.category] ?? 0) + 1;
      const code = event.countryCode ?? 'XX';
      byCountry[code] = (byCountry[code] ?? 0) + 1;
    }

    return { byCategory, byCountry, total: events.length };
  }
}
