import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface OpenWeatherAlert {
  event: string;
  description: string;
  start: number;
  end: number;
  sender_name: string;
  tags: string[];
}

export class OpenWeatherCollector extends BaseCollector {
  constructor(apiKey?: string) {
    super({
      name: 'OpenWeather Alerts',
      source: 'openweather',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [EventSubType.STORM, EventSubType.FLOOD, EventSubType.HEAT_WAVE, EventSubType.BLIZZARD],
      enabled: true,
      intervalMs: 120000,
      apiKey,
      baseUrl: 'https://api.openweathermap.org/data/3.0/onecall',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      if (!this.config.apiKey) {
        return {
          source: 'openweather',
          events: [],
          fetchedAt: new Date().toISOString(),
          success: false,
          error: 'API key not configured',
        };
      }

      const response = await this.request(
        `${this.config.baseUrl}?lat=0&lon=0&appid=${this.config.apiKey}&exclude=current,minutely,hourly,daily`,
      );

      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = (await response.json()) as { alerts?: OpenWeatherAlert[] };
      const events: GlobalEvent[] = [];

      if (data.alerts) {
        for (const alert of data.alerts) {
          const subType = this.mapTagToSubType(alert.tags);
          const event = this.createEvent({
            title: alert.event,
            description: alert.description.slice(0, 500),
            category: EventCategory.NATURAL_DISASTER,
            subType,
            timestamp: new Date(alert.start * 1000).toISOString(),
            riskScore: subType === EventSubType.STORM ? 60 : 40,
            riskLevel: subType === EventSubType.STORM ? 3 : 2,
          });
          events.push(event);
        }
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'openweather',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'openweather',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapTagToSubType(tags: string[]): EventSubType {
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));

    if (tagSet.has('flood')) return EventSubType.FLOOD;
    if (tagSet.has('heat') || tagSet.has('extreme high temperature'))
      return EventSubType.HEAT_WAVE;
    if (tagSet.has('blizzard') || tagSet.has('snow'))
      return EventSubType.BLIZZARD;

    return EventSubType.STORM;
  }
}
