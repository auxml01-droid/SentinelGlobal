import { BaseCollector } from './base-collector';
import { CollectorResult, EventCategory, EventSubType, EventStatus, GlobalEvent } from '@sentinel/types';

interface WHOEvent {
  id: string;
  headline: string;
  description: string;
  date: string;
  type: string;
  severity: string;
  country: string[];
  status: string;
  url: string;
}

export class WHOCollector extends BaseCollector {
  constructor() {
    super({
      name: 'WHO Health Alerts',
      source: 'who',
      category: EventCategory.HEALTH,
      subTypes: [
        EventSubType.PANDEMIC,
        EventSubType.EPIDEMIC,
        EventSubType.WHO_ALERT,
        EventSubType.NEW_VIRUS,
      ],
      enabled: true,
      intervalMs: 600000,
      baseUrl: 'https://www.who.int/api/newsroom/emergencies',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const response = await this.request(this.config.baseUrl, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`WHO API error: ${response.status}`);
      }

      const data = (await response.json()) as { value: WHOEvent[] };
      const events: GlobalEvent[] = [];

      for (const item of (data.value || []).slice(0, 50)) {
        const subType = this.classifyHealthEvent(item);
        const riskScore = subType === EventSubType.PANDEMIC ? 85
          : subType === EventSubType.NEW_VIRUS ? 75
          : subType === EventSubType.EPIDEMIC ? 60
          : 40;

        events.push(this.createEvent({
          id: `who-${item.id}`,
          title: item.headline,
          description: item.description?.slice(0, 500),
          category: EventCategory.HEALTH,
          subType,
          location: { lat: 0, lng: 0 },
          locationName: (item.country || []).join(', '),
          countryCode: item.country?.[0],
          sourceUrl: item.url,
          impact: {},
          riskScore,
          riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
          timestamp: new Date(item.date).toISOString(),
          status: item.status === 'ongoing' ? EventStatus.CREATED : EventStatus.UPDATED,
        }));
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'who',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'who',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private classifyHealthEvent(item: WHOEvent): EventSubType {
    const headline = `${item.headline} ${item.description} ${item.type || ''}`.toLowerCase();

    if (headline.includes('pandemic') || headline.includes('global emergency') || item.severity === 'Global') return EventSubType.PANDEMIC;
    if (headline.includes('new virus') || headline.includes('novel') || headline.includes('new strain') || headline.includes('variant')) return EventSubType.NEW_VIRUS;
    if (headline.includes('epidemic') || headline.includes('outbreak') || headline.includes('emergency')) return EventSubType.EPIDEMIC;

    return EventSubType.WHO_ALERT;
  }
}
