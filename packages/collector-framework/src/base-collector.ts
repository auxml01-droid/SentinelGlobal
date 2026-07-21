import { GlobalEvent, CollectorSource } from '@sentinel/types';

export interface CollectorHealthStatus {
  source: CollectorSource;
  status: 'online' | 'degraded' | 'offline' | 'starting';
  lastFetchAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  uptimePercent: number;
  avgResponseTimeMs: number;
  totalFetched: number;
  totalErrors: number;
  consecutiveErrors: number;
}

export interface CollectorStats {
  source: CollectorSource;
  totalFetched: number;
  totalNormalized: number;
  totalPublished: number;
  totalErrors: number;
  startTime: string;
  uptimeSeconds: number;
}

export abstract class BaseCollector {
  public readonly source: CollectorSource;
  public readonly name: string;
  public readonly intervalMs: number;

  protected apiKey?: string;
  protected baseUrl: string;
  protected running = false;
  protected timer: ReturnType<typeof setInterval> | null = null;

  private _stats: CollectorStats;
  private _health: CollectorHealthStatus;
  private _lastFetchDuration: number[] = [];

  constructor(config: {
    source: CollectorSource;
    name: string;
    intervalMs: number;
    baseUrl: string;
    apiKey?: string;
  }) {
    this.source = config.source;
    this.name = config.name;
    this.intervalMs = config.intervalMs;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;

    const now = new Date().toISOString();
    this._stats = {
      source: config.source,
      totalFetched: 0,
      totalNormalized: 0,
      totalPublished: 0,
      totalErrors: 0,
      startTime: now,
      uptimeSeconds: 0,
    };

    this._health = {
      source: config.source,
      status: 'starting',
      uptimePercent: 100,
      avgResponseTimeMs: 0,
      totalFetched: 0,
      totalErrors: 0,
      consecutiveErrors: 0,
    };
  }

  abstract fetch(): Promise<unknown[]>;
  abstract normalize(raw: unknown): Partial<GlobalEvent> | null;
  validate(event: Partial<GlobalEvent>): boolean {
    return !!event.title && !!event.category && !!event.subType && !!event.location;
  }

  async collect(): Promise<GlobalEvent[]> {
    const start = Date.now();
    try {
      const rawData = await this.fetch();
      const duration = Date.now() - start;
      this._lastFetchDuration.push(duration);
      if (this._lastFetchDuration.length > 50) this._lastFetchDuration.shift();

      this._stats.totalFetched++;

      const events: GlobalEvent[] = [];
      for (const raw of rawData) {
        const normalized = this.normalize(raw);
        if (normalized && this.validate(normalized)) {
          events.push(normalized as GlobalEvent);
          this._stats.totalNormalized++;
        }
      }

      this._health.status = 'online';
      this._health.lastSuccessAt = new Date().toISOString();
      this._health.consecutiveErrors = 0;

      return events;
    } catch (error) {
      const duration = Date.now() - start;
      this._lastFetchDuration.push(duration);
      this._stats.totalErrors++;
      this._health.consecutiveErrors++;
      this._health.lastError = error instanceof Error ? error.message : String(error);

      if (this._health.consecutiveErrors >= 5) {
        this._health.status = 'degraded';
      }
      if (this._health.consecutiveErrors >= 20) {
        this._health.status = 'offline';
      }

      throw error;
    }
  }

  get health(): CollectorHealthStatus {
    const durations = this._lastFetchDuration;
    this._health.avgResponseTimeMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    this._health.totalFetched = this._stats.totalFetched;
    this._health.totalErrors = this._stats.totalErrors;
    const total = this._stats.totalFetched + this._stats.totalErrors;
    this._health.uptimePercent = total > 0
      ? Math.round((this._stats.totalFetched / total) * 100)
      : 100;
    this._health.lastFetchAt = new Date().toISOString();
    return { ...this._health };
  }

  get stats(): CollectorStats {
    const now = Date.now();
    const startMs = new Date(this._stats.startTime).getTime();
    this._stats.uptimeSeconds = Math.round((now - startMs) / 1000);
    return { ...this._stats };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this._health.status = 'online';
    this.run();
    this.timer = setInterval(() => this.run(), this.intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  protected abstract run(): Promise<void>;
}
