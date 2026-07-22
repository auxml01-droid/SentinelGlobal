import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface NHCStorm {
  id: string;
  name: string;
  year: number;
  basin: string;
  subbasin: string;
  status: string;
  category: string;
  windSpeed: number;
  pressure: number;
  latitude: number;
  longitude: number;
  movementDir: number;
  movementSpeed: number;
  lastUpdate: string;
}

export class NHCCollector extends BaseCollector {
  constructor() {
    super({
      name: 'National Hurricane Center',
      source: 'nhc',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [EventSubType.HURRICANE, EventSubType.STORM],
      enabled: true,
      intervalMs: 120000,
      baseUrl: 'https://www.nhc.noaa.gov/CurrentStorms.json',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const response = await this.request(this.config.baseUrl);

      if (!response.ok) {
        throw new Error(`NHC API error: ${response.status}`);
      }

      const data = (await response.json()) as { activeStorms: NHCStorm[] };
      const events: GlobalEvent[] = [];

      for (const storm of data.activeStorms || []) {
        const isHurricane = (storm.windSpeed || 0) >= 74;
        const categoryNum = this.saffirSimpsonCategory(storm.windSpeed || 0);
        const riskScore = Math.min(Math.round((storm.windSpeed || 0) * 0.8 + categoryNum * 10), 100);

        events.push(this.createEvent({
          id: `nhc-${storm.id}`,
          title: `${isHurricane ? 'Furacão' : 'Tempestade'} ${storm.name} - Cat ${categoryNum}`,
          description: `Ventos: ${storm.windSpeed} mph | Pressão: ${storm.pressure} mb | Direção: ${storm.movementDir}° | Velocidade: ${storm.movementSpeed} mph`,
          category: EventCategory.NATURAL_DISASTER,
          subType: isHurricane ? EventSubType.HURRICANE : EventSubType.STORM,
          location: { lat: storm.latitude, lng: storm.longitude },
          locationName: `${storm.name} - ${storm.basin}`,
          impact: {
            magnitude: categoryNum,
            radius: isHurricane ? 200 : 100,
            affectedArea: isHurricane ? 500 : 200,
          },
          riskScore,
          riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
          timestamp: new Date(storm.lastUpdate || Date.now()).toISOString(),
        }));
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'nhc',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'nhc',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private saffirSimpsonCategory(windMph: number): number {
    if (windMph >= 157) return 5;
    if (windMph >= 130) return 4;
    if (windMph >= 111) return 3;
    if (windMph >= 96) return 2;
    if (windMph >= 74) return 1;
    return 0;
  }
}
