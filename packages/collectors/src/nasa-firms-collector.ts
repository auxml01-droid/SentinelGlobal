import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface FIRMSFeature {
  latitude: number;
  longitude: number;
  bright_ti4: number;
  scan: number;
  track: number;
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
  version: string;
  bright_ti5: number;
  daynight: string;
}

export class FIRMSCollector extends BaseCollector {
  constructor(apiKey?: string) {
    super({
      name: 'NASA FIRMS',
      source: 'nasa_firms',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [EventSubType.WILDFIRE],
      enabled: true,
      intervalMs: 60000,
      apiKey,
      baseUrl: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const response = await this.request(
        `${this.config.baseUrl}/${this.config.apiKey}/VIIRS_SNPP_NRT/1/0/0/1`,
      );

      if (!response.ok) {
        throw new Error(`FIRMS API error: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.trim().split('\n').slice(1);
      const events: GlobalEvent[] = [];

      for (const line of lines.slice(0, 100)) {
        const parts = line.split(',');
        if (parts.length < 10) continue;

        const lat = parseFloat(parts[0]!);
        const lng = parseFloat(parts[1]!);

        const event = this.createEvent({
          title: `Incêndio - Satélite ${parts[5]}`,
          category: EventCategory.NATURAL_DISASTER,
          subType: EventSubType.WILDFIRE,
          location: { lat, lng },
          impact: {
            affectedArea: parseFloat(parts[2] ?? '0'),
          },
          riskScore: 50,
          riskLevel: 3,
          timestamp: new Date(`${parts[3]}T${parts[4]}`).toISOString(),
        });

        events.push(event);
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'nasa_firms',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'nasa_firms',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
