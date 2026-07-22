import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface NOAAAlert {
  id: string;
  messageType: string;
  status: string;
  scope: string;
  category: string;
  event: string;
  urgency: string;
  severity: string;
  certainty: string;
  headline: string;
  description: string;
  effective: string;
  expires: string;
  areas: Array<{
    areaDesc: string;
    polygon?: string;
    circle?: string;
    geocode?: { value: string };
  }>;
}

export class NOAACollector extends BaseCollector {
  constructor() {
    super({
      name: 'NOAA Weather Alerts',
      source: 'noaa',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [
        EventSubType.STORM,
        EventSubType.FLOOD,
        EventSubType.HEAT_WAVE,
        EventSubType.BLIZZARD,
        EventSubType.TORNADO,
        EventSubType.HURRICANE,
      ],
      enabled: true,
      intervalMs: 120000,
      baseUrl: 'https://api.weather.gov/alerts/active',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const response = await this.request(this.config.baseUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`NOAA API error: ${response.status}`);
      }

      const data = (await response.json()) as { features: Array<{ properties: NOAAAlert }> };
      const events: GlobalEvent[] = [];

      for (const feature of data.features.slice(0, 100)) {
        const alert = feature.properties;
        const subType = this.mapNOAACategory(alert.category, alert.event);
        const coords = this.extractCoords(alert);
        if (!coords) continue;

        const severityMap: Record<string, number> = {
          Extreme: 85, Severe: 70, Moderate: 50, Minor: 30, Unknown: 20,
        };
        const riskScore = severityMap[alert.severity] ?? 30;

        events.push(this.createEvent({
          id: `noaa-${alert.id}`,
          title: alert.headline || alert.event,
          description: alert.description?.slice(0, 500),
          category: EventCategory.NATURAL_DISASTER,
          subType,
          location: coords,
          locationName: alert.areas?.[0]?.areaDesc,
          impact: { affectedArea: 100 },
          riskScore,
          riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
          timestamp: new Date(alert.effective).toISOString(),
        }));
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'noaa',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'noaa',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapNOAACategory(category: string, event: string): EventSubType {
    const cat = category?.toLowerCase() || '';
    const evt = event?.toLowerCase() || '';

    if (evt.includes('hurricane') || evt.includes('cyclone')) return EventSubType.HURRICANE;
    if (evt.includes('tornado')) return EventSubType.TORNADO;
    if (evt.includes('flood') || evt.includes('flash flood')) return EventSubType.FLOOD;
    if (evt.includes('heat') || evt.includes('extreme high')) return EventSubType.HEAT_WAVE;
    if (evt.includes('blizzard') || evt.includes('snow') || evt.includes('ice')) return EventSubType.BLIZZARD;
    if (evt.includes('storm') || evt.includes('wind') || evt.includes('thunder')) return EventSubType.STORM;

    return EventSubType.STORM;
  }

  private extractCoords(alert: NOAAAlert): { lat: number; lng: number } | null {
    const area = alert.areas?.[0];
    if (!area) return null;

    if (area.circle) {
      const parts = area.circle.split(' ');
      if (parts.length >= 2) {
        const coords = parts[0]!.split(',');
        return { lat: parseFloat(coords[0]!), lng: parseFloat(coords[1]!) };
      }
    }

    if (area.geocode?.value) {
      const parts = area.geocode.value.split(',');
      if (parts.length >= 2) {
        return { lat: parseFloat(parts[0]!), lng: parseFloat(parts[1]!) };
      }
    }

    return { lat: 39.8283, lng: -98.5795 };
  }
}
