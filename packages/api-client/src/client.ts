import {
  ClientConfig,
  EventFilters,
  ApiResponse,
  RiskSummary,
  WebhookConfig,
  WebhookDelivery,
} from './types';
import { GlobalEvent, GlobalRiskScore, AIResponse } from '@sentinel/types';

const DEFAULT_BASE_URL = 'https://api.sentinelglobal.io/v1';
const DEFAULT_TIMEOUT = 10000;

export class SentinelClient {
  private config: ClientConfig;

  constructor(config: ClientConfig = {}) {
    this.config = {
      baseUrl: DEFAULT_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      ...config,
    };
  }

  setApiKey(key: string): void {
    this.config.apiKey = key;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | undefined>,
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.config.baseUrl}${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value));
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SentinelGlobal-SDK/1.0',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API ${response.status}: ${errorBody}`);
      }

      return (await response.json()) as ApiResponse<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getEvents(filters?: EventFilters): Promise<ApiResponse<GlobalEvent[]>> {
    return this.request<GlobalEvent[]>('GET', '/events', undefined, filters as Record<string, string | number | undefined>);
  }

  async getEvent(id: string): Promise<ApiResponse<GlobalEvent>> {
    return this.request<GlobalEvent>('GET', `/events/${id}`);
  }

  async getRiskSummary(): Promise<ApiResponse<RiskSummary>> {
    return this.request<RiskSummary>('GET', '/risk/summary');
  }

  async getGlobalRisk(): Promise<ApiResponse<GlobalRiskScore>> {
    return this.request<GlobalRiskScore>('GET', '/risk');
  }

  async getCountryRisk(countryCode: string): Promise<ApiResponse<{ score: number; level: number }>> {
    return this.request<{ score: number; level: number }>('GET', `/risk/country/${countryCode}`);
  }

  async queryAI(question: string): Promise<ApiResponse<AIResponse>> {
    return this.request<AIResponse>('POST', '/ai/query', { query: question });
  }

  async getTimeline(range: '5m' | '1h' | '24h' | '7d' | '30d'): Promise<ApiResponse<GlobalEvent[]>> {
    return this.getEvents({ range, limit: 500 });
  }

  async getCountryTimeline(countryCode: string, range: '5m' | '1h' | '24h' | '7d' | '30d'): Promise<ApiResponse<GlobalEvent[]>> {
    return this.getEvents({ country: countryCode, range, limit: 500 });
  }

  async getStats(): Promise<ApiResponse<{ total: number; byCategory: Record<string, number> }>> {
    return this.request('GET', '/events/stats') as Promise<any>;
  }

  async createWebhook(config: WebhookConfig): Promise<ApiResponse<WebhookConfig>> {
    return this.request<WebhookConfig>('POST', '/webhooks', config);
  }

  async listWebhooks(): Promise<ApiResponse<WebhookConfig[]>> {
    return this.request<WebhookConfig[]>('GET', '/webhooks');
  }

  async deleteWebhook(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>('DELETE', `/webhooks/${id}`);
  }

  async getWebhookDeliveries(webhookId: string): Promise<ApiResponse<WebhookDelivery[]>> {
    return this.request<WebhookDelivery[]>('GET', `/webhooks/${webhookId}/deliveries`);
  }

  health(): { status: string; version: string } {
    return { status: 'ok', version: '1.0.0' };
  }
}
