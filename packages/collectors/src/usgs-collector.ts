import { BaseCollector } from './base-collector';
import { CollectorResult, EventCategory, EventSubType, EventStatus, GlobalEvent } from '@sentinel/types';

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    detail: string;
    type: string;
    title: string;
    status: string;
    tsunami: number;
    sig: number;
    magType: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
}

interface USGSResponse {
  type: string;
  metadata: {
    count: number;
    generated: number;
  };
  features: USGSFeature[];
}

export class USGSCollector extends BaseCollector {
  constructor(apiKey?: string) {
    super({
      name: 'USGS Earthquake',
      source: 'usgs',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [EventSubType.EARTHQUAKE, EventSubType.TSUNAMI],
      enabled: true,
      intervalMs: 30000,
      apiKey,
      baseUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const response = await this.request(
        `${this.config.baseUrl}/all_hour.geojson`,
      );

      if (!response.ok) {
        throw new Error(`USGS API error: ${response.status}`);
      }

      const data = (await response.json()) as USGSResponse;
      const events: GlobalEvent[] = data.features.map((feature) =>
        this.usgsToEvent(feature),
      );

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'usgs',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'usgs',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private usgsToEvent(feature: USGSFeature): GlobalEvent {
    const [lng, lat, depth] = feature.geometry.coordinates;
    const mag = feature.properties.mag;
    const title = feature.properties.title;

    let subType = EventSubType.EARTHQUAKE;
    if (feature.properties.tsunami > 0) {
      subType = EventSubType.TSUNAMI;
    }

    const riskScore = Math.min(Math.round(mag * 12 + (feature.properties.sig / 100) * 3), 100);

    return this.createEvent({
      id: `usgs-${feature.id}`,
      title,
      description: `${mag}M - ${feature.properties.place}`,
      category: EventCategory.NATURAL_DISASTER,
      subType,
      location: { lat, lng },
      locationName: feature.properties.place,
      sourceUrl: feature.properties.url,
      impact: {
        magnitude: mag,
        depth,
      },
      riskScore,
      riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
      timestamp: new Date(feature.properties.time).toISOString(),
      updatedAt: new Date(feature.properties.updated).toISOString(),
        status: feature.properties.status === 'AUTOMATIC' ? EventStatus.CREATED : EventStatus.UPDATED,
    });
  }
}
