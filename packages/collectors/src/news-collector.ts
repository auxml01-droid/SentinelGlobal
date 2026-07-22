import { BaseCollector } from './base-collector.js';
import { CollectorResult, EventCategory, EventSubType, GlobalEvent } from '@sentinel/types';

interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  source: { name: string };
  publishedAt: string;
  author: string;
  urlToImage: string;
}

export class NewsCollector extends BaseCollector {
  private sources: string[];

  constructor(apiKey?: string) {
    super({
      name: 'News Intelligence',
      source: 'reuters',
      category: EventCategory.CONFLICT,
      subTypes: [
        EventSubType.WAR,
        EventSubType.MILITARY_ATTACK,
        EventSubType.TERRORISM,
        EventSubType.DIPLOMATIC_TENSION,
      ],
      enabled: true,
      intervalMs: 300000,
      apiKey,
      baseUrl: 'https://newsapi.org/v2/everything',
    });

    this.sources = ['reuters', 'associated-press', 'bbc-news', 'cnn', 'al-jazeera-english'];
  }

  async fetch(): Promise<CollectorResult> {
    try {
      if (!this.config.apiKey) {
        return {
          source: 'reuters',
          events: [],
          fetchedAt: new Date().toISOString(),
          success: false,
          error: 'NewsAPI key not configured',
        };
      }

      const keywords = ['earthquake', 'hurricane', 'flood', 'wildfire', 'war', 'attack',
        'conflict', 'pandemic', 'eruption', 'tsunami', 'strike', 'bombing',
        'missile', 'nuclear', 'terrorism', 'military', 'tornado', 'storm'];

      const query = keywords.join(' OR ');
      const url = `${this.config.baseUrl}?q=${encodeURIComponent(query)}&sources=${this.sources.join(',')}&sortBy=publishedAt&pageSize=50&language=en&apiKey=${this.config.apiKey}`;

      const response = await this.request(url);

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const data = (await response.json()) as { articles: NewsArticle[] };
      const events: GlobalEvent[] = [];

      for (const article of (data.articles || [])) {
        const classification = this.classifyArticle(article);
        if (!classification) continue;

        events.push(this.createEvent({
          id: `news-${simpleHash(article.url).slice(0, 20)}`,
          title: article.title,
          description: article.description?.slice(0, 500),
          category: classification.category,
          subType: classification.subType,
          location: classification.location,
          locationName: classification.region,
          countryCode: classification.country,
          sourceUrl: article.url,
          impact: {},
          riskScore: classification.riskScore,
          riskLevel: Math.min(Math.ceil(classification.riskScore / 20), 6),
          timestamp: new Date(article.publishedAt).toISOString(),
          metadata: { source: article.source.name, author: article.author },
        }));
      }

      this.totalFetched += events.length;
      this.lastFetchAt = new Date().toISOString();

      return {
        source: 'reuters',
        events,
        fetchedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        source: 'reuters',
        events: [],
        fetchedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private classifyArticle(article: NewsArticle): {
    category: EventCategory;
    subType: EventSubType;
    riskScore: number;
    location: { lat: number; lng: number };
    region?: string;
    country?: string;
  } | null {
    const text = `${article.title} ${article.description}`.toLowerCase();

    if (text.includes('earthquake') || text.includes('magnitude'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.EARTHQUAKE, riskScore: 50, location: { lat: 0, lng: 0 } };

    if (text.includes('hurricane') || text.includes('cyclone'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.HURRICANE, riskScore: 60, location: { lat: 0, lng: 0 } };

    if (text.includes('flood') || text.includes('flooding'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.FLOOD, riskScore: 45, location: { lat: 0, lng: 0 } };

    if (text.includes('wildfire') || text.includes('forest fire'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.WILDFIRE, riskScore: 55, location: { lat: 0, lng: 0 } };

    if (text.includes('volcano') || text.includes('eruption'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.VOLCANO, riskScore: 55, location: { lat: 0, lng: 0 } };

    if (text.includes('tornado'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.TORNADO, riskScore: 50, location: { lat: 0, lng: 0 } };

    if (text.includes('tsunami'))
      return { category: EventCategory.NATURAL_DISASTER, subType: EventSubType.TSUNAMI, riskScore: 70, location: { lat: 0, lng: 0 } };

    if (text.includes('war') || text.includes('invasion'))
      return { category: EventCategory.CONFLICT, subType: EventSubType.WAR, riskScore: 80, location: { lat: 0, lng: 0 } };

    if (text.includes('missile') || text.includes('strike') || text.includes('bomb'))
      return { category: EventCategory.CONFLICT, subType: EventSubType.MISSILE_LAUNCH, riskScore: 70, location: { lat: 0, lng: 0 } };

    if (text.includes('attack') || text.includes('military operation'))
      return { category: EventCategory.CONFLICT, subType: EventSubType.MILITARY_ATTACK, riskScore: 60, location: { lat: 0, lng: 0 } };

    if (text.includes('terrorism') || text.includes('terrorist'))
      return { category: EventCategory.CONFLICT, subType: EventSubType.TERRORISM, riskScore: 75, location: { lat: 0, lng: 0 } };

    if (text.includes('nuclear') || text.includes('radiation'))
      return { category: EventCategory.TECH_RISK, subType: EventSubType.NUCLEAR_LEAK, riskScore: 80, location: { lat: 0, lng: 0 } };

    if (text.includes('pandemic') || text.includes('outbreak') || text.includes('virus'))
      return { category: EventCategory.HEALTH, subType: EventSubType.EPIDEMIC, riskScore: 60, location: { lat: 0, lng: 0 } };

    if (text.includes('cyber') || text.includes('hack'))
      return { category: EventCategory.CONFLICT, subType: EventSubType.CYBER_ATTACK, riskScore: 50, location: { lat: 0, lng: 0 } };

    return null;
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
