import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, EventStatus, GlobalEvent } from '@sentinel/types';

interface VolcanoReport {
  volcano_number: string;
  volcano_name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  type: string;
  status: string;
  last_eruption_year: string;
  activity_level?: string;
}

export class SmithsonianCollector extends BaseCollector {
  constructor() {
    super({
      name: 'Smithsonian Volcanoes',
      source: 'smithsonian_volcano',
      category: EventCategory.NATURAL_DISASTER,
      subTypes: [EventSubType.VOLCANO],
      enabled: true,
      intervalMs: 300000,
      baseUrl: 'https://volcano.si.edu/volcanoes.json',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const response = await this.request(this.config.baseUrl);

      if (!response.ok) {
        throw new Error(`Smithsonian API error: ${response.status}`);
      }

      const data = (await response.json()) as { volcanoes: VolcanoReport[] };
      const events: GlobalEvent[] = [];

      for (const volcano of data.volcanoes.slice(0, 50)) {
        const isActive = volcano.status?.toLowerCase().includes('erupt') ||
                         volcano.activity_level === 'Elevated';

        if (isActive) {
          const riskScore = volcano.activity_level === 'Elevated' ? 55 : 40;

          events.push(this.createEvent({
            id: `smith-${volcano.volcano_number}`,
            title: `Vulcão ${volcano.volcano_name} - ${volcano.status || 'Ativo'}`,
            description: `${volcano.volcano_name}, ${volcano.country}. Tipo: ${volcano.type}. Última erupção: ${volcano.last_eruption_year}`,
            category: EventCategory.NATURAL_DISASTER,
            subType: EventSubType.VOLCANO,
            location: { lat: volcano.latitude, lng: volcano.longitude },
            locationName: `${volcano.volcano_name}, ${volcano.country}`,
            impact: { radius: 10 },
            riskScore,
            riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
            status: EventStatus.CREATED,
          }));
        }
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'smithsonian_volcano',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'smithsonian_volcano',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
