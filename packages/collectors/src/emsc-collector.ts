import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface EMSCEvent {
  eventid: string;
  mag: number;
  place: string;
  time: string;
  lat: number;
  lon: number;
  depth: number;
  region: string;
  magnitude_type: string;
}

export class EMSCCollector extends BaseCollector {
  constructor() {
    super({
      name: 'EMSC Earthquake',
      source: 'emsc',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [EventSubType.EARTHQUAKE],
      enabled: true,
      intervalMs: 30000,
      baseUrl: 'https://www.seismicportal.eu/fdsnws/event/1/query',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const url = `${this.config.baseUrl}?format=json&limit=100&minmag=2.5&orderby=time`;
      const response = await this.request(url);

      if (!response.ok) {
        throw new Error(`EMSC API error: ${response.status}`);
      }

      const data = (await response.json()) as { features: Array<{ properties: EMSCEvent; geometry: { coordinates: number[] } }> };
      const events: GlobalEvent[] = data.features.map((f) => this.emscToEvent(f.properties, f.geometry.coordinates));

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'emsc',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'emsc',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private emscToEvent(props: EMSCEvent, coords: number[]): GlobalEvent {
    const lng = coords[0] ?? 0;
    const lat = coords[1] ?? 0;
    const depth = coords[2] ?? 0;
    const riskScore = Math.min(Math.round((props.mag ?? 0) * 12), 100);

    return this.createEvent({
      id: `emsc-${props.eventid}`,
      title: `${props.mag}M - ${props.region}`,
      description: `${props.mag} ${props.magnitude_type} em ${props.place}`,
      category: EventCategory.NATURAL_DISASTER,
      subType: EventSubType.EARTHQUAKE,
      location: { lat, lng },
      locationName: props.place,
      impact: { magnitude: props.mag, depth },
      riskScore,
      riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
      timestamp: new Date(props.time).toISOString(),
    });
  }
}
