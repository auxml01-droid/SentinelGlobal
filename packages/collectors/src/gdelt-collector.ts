import { BaseCollector } from './base-collector';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface GDELTEvent {
  id: string;
  day: string;
  monthyear: string;
  year: string;
  fractiondate: string;
  actor1name: string;
  actor1country: string;
  actor2name: string;
  actor2country: string;
  eventcode: string;
  eventrootcode: string;
  eventbasecode: string;
  goldsteinscale: number;
  nummentions: number;
  avgtone: number;
  actiongeo_fullname: string;
  actiongeo_lat: number;
  actiongeo_long: number;
  actiongeo_country: string;
  sourceurl: string;
}

export class GDELTCollector extends BaseCollector {
  constructor() {
    super({
      name: 'GDELT Events',
      source: 'gdelt',
      category: EventCategory.CONFLICT,
      subTypes: [
        EventSubType.WAR,
        EventSubType.MILITARY_ATTACK,
        EventSubType.DIPLOMATIC_TENSION,
        EventSubType.TERRORISM,
      ],
      enabled: true,
      intervalMs: 300000,
      baseUrl: 'https://api.gdeltproject.org/api/v2/doc/doc',
    });
  }

  async fetch(): Promise<CollectorResult> {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      const url = `${this.config.baseUrl}?query=conflict%20OR%20attack%20OR%20war%20OR%20terrorism&mode=artlist&format=json&maxrecords=75&startdatetime=${dateStr}`;

      const response = await this.request(url);

      if (!response.ok) {
        throw new Error(`GDELT API error: ${response.status}`);
      }

      const data = (await response.json()) as { articles: GDELTEvent[] };
      const events: GlobalEvent[] = [];

      for (const article of (data.articles || []).slice(0, 75)) {
        const subType = this.classifyGDELTEvent(article.eventrootcode, article.avgtone);
        const toneScore = Math.abs(article.avgtone || 0);
        const riskScore = Math.min(Math.round(toneScore * 2 + article.nummentions * 0.5 + 20), 100);

        events.push(this.createEvent({
          id: `gdelt-${article.id || article.sourceurl}`,
          title: `${article.actor1name} - ${article.actor2name}`,
          description: `Código: ${article.eventcode} | Menções: ${article.nummentions} | Tone: ${article.avgtone}`,
          category: EventCategory.CONFLICT,
          subType,
          location: {
            lat: article.actiongeo_lat || 0,
            lng: article.actiongeo_long || 0,
          },
          locationName: article.actiongeo_fullname,
          countryCode: article.actiongeo_country,
          sourceUrl: article.sourceurl,
          impact: {},
          riskScore,
          riskLevel: Math.min(Math.ceil(riskScore / 20), 6),
          timestamp: new Date(article.day || Date.now()).toISOString(),
          metadata: {
            goldsteinScale: article.goldsteinscale,
            avgTone: article.avgtone,
            numMentions: article.nummentions,
          },
        }));
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'gdelt',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'gdelt',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private classifyGDELTEvent(rootCode: string, tone: number): EventSubType {
    const code = rootCode?.toString() || '';

    if (code.startsWith('19') || code.startsWith('20')) return EventSubType.WAR;
    if (code.startsWith('18') || code.startsWith('21')) return EventSubType.MILITARY_ATTACK;
    if (code.startsWith('14') || code.startsWith('15')) return EventSubType.DIPLOMATIC_TENSION;
    if (code.startsWith('22')) return EventSubType.TERRORISM;

    if (tone < -5) return EventSubType.DIPLOMATIC_TENSION;
    return EventSubType.MILITARY_MOVEMENT;
  }
}
