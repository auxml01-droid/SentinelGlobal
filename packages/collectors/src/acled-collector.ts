import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface ACLEDEvent {
  data_id: string;
  event_id_cnty: string;
  event_date: string;
  year: number;
  time_precision: number;
  disorder_type: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  region: string;
  country: string;
  admin1: string;
  admin2: string;
  location: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  notes: string;
  source: string;
}

export class ACLEDCollector extends BaseCollector {
  constructor(apiKey?: string) {
    super({
      name: 'ACLED Conflict',
      source: 'acled',
      category: EventCategory.CONFLICT,
      subTypes: [
        EventSubType.WAR,
        EventSubType.MILITARY_ATTACK,
        EventSubType.BOMBING,
        EventSubType.TERRORISM,
        EventSubType.MILITARY_MOVEMENT,
      ],
      enabled: true,
      intervalMs: 360000,
      apiKey,
      baseUrl: 'https://api.acleddata.com/acled/read',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      if (!this.config.apiKey) {
        return {
          source: 'acled',
          events: [],
          fetchedAt: new Date().toISOString(),
          success: false,
          error: 'ACLED API key not configured',
        };
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const url = `${this.config.baseUrl}?key=${this.config.apiKey}&email=sentinel@global&limit=100&event_date_where=%3E%3D&event_date=${sevenDaysAgo.toISOString().split('T')[0]}&format=json`;

      const response = await this.request(url);

      if (!response.ok) {
        throw new Error(`ACLED API error: ${response.status}`);
      }

      const data = (await response.json()) as { data: ACLEDEvent[] };
      const events: GlobalEvent[] = (data.data || []).map((event) =>
        this.acledToEvent(event),
      );

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'acled',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'acled',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private acledToEvent(event: ACLEDEvent): GlobalEvent {
    const subType = this.mapEventType(event.event_type, event.sub_event_type);
    const riskScore = Math.min(Math.round(25 + Math.log2(event.fatalities + 1) * 15), 100);

    return this.createEvent({
      id: `acled-${event.data_id}`,
      title: `${event.event_type} - ${event.location}`,
      description: `${event.actor1}${event.actor2 ? ` vs ${event.actor2}` : ''} | ${event.notes?.slice(0, 300)}`,
      category: EventCategory.CONFLICT,
      subType,
      location: { lat: event.latitude, lng: event.longitude },
      locationName: `${event.location}, ${event.country}`,
      countryCode: event.country,
      countryName: event.country,
      impact: { fatalities: event.fatalities },
      riskScore,
      riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
      timestamp: new Date(event.event_date).toISOString(),
      metadata: {
        actor1: event.actor1,
        actor2: event.actor2,
        region: event.region,
        disorderType: event.disorder_type,
      },
    });
  }

  private mapEventType(eventType: string, subType: string): EventSubType {
    const e = eventType?.toLowerCase() || '';
    const s = subType?.toLowerCase() || '';

    if (e.includes('battle') || s.includes('armed clash') || s.includes('government regain')) return EventSubType.WAR;
    if (e.includes('explosion') || s.includes('remote violence') || s.includes('shelling') || s.includes('air strike')) return EventSubType.BOMBING;
    if (s.includes('attack') || s.includes('armed')) return EventSubType.MILITARY_ATTACK;
    if (e.includes('terrorism') || s.includes('suicide') || s.includes('terror')) return EventSubType.TERRORISM;
    if (e.includes('strategic') || s.includes('looting') || s.includes('non-violent')) return EventSubType.MILITARY_MOVEMENT;

    return EventSubType.MILITARY_ATTACK;
  }
}
