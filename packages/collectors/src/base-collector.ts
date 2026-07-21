import { GlobalEvent, EventCategory, EventSubType, EventStatus, CollectorConfig, CollectorResult, CollectorSource } from '@sentinel/types';

export abstract class BaseCollector {
  public config: CollectorConfig;
  protected lastFetchAt?: string;
  protected errorCount: number = 0;
  protected totalFetched: number = 0;

  constructor(config: CollectorConfig) {
    this.config = config;
  }

  abstract fetch(): Promise<CollectorResult>;

  protected createEvent(partial: Partial<GlobalEvent>): GlobalEvent {
    const now = new Date().toISOString();
    return {
      id: partial.id ?? crypto.randomUUID(),
      title: partial.title ?? 'Evento desconhecido',
      category: partial.category ?? EventCategory.NATURAL_DISASTER,
      subType: partial.subType ?? EventSubType.EARTHQUAKE,
      location: partial.location ?? { lat: 0, lng: 0 },
      impact: partial.impact ?? {},
      riskScore: partial.riskScore ?? 0,
      riskLevel: partial.riskLevel ?? 1,
      source: this.config.source,
      timestamp: partial.timestamp ?? now,
      updatedAt: now,
      status: partial.status ?? EventStatus.CREATED,
      lifecycle: partial.lifecycle ?? { created: now, updated: now },
      ...partial,
    };
  }

  protected async request(url: string, options?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent': 'SentinelGlobal/1.0',
      ...(options?.headers as Record<string, string>),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const startTime = Date.now();
    const response = await fetch(url, { ...options, headers });

    return response;
  }

  getSource(): CollectorSource {
    return this.config.source;
  }

  getName(): string {
    return this.config.name;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getInterval(): number {
    return this.config.intervalMs;
  }
}
