import { Injectable } from '@nestjs/common';
import { GlobalEvent } from '@sentinel/types';

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  minRiskLevel: number;
  countries: string[];
  active: boolean;
  secret?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'delivered' | 'failed' | 'pending';
  attempts: number;
  timestamp: string;
}

@Injectable()
export class WebhooksService {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveries: WebhookDelivery[] = [];

  create(config: Omit<WebhookConfig, 'id' | 'createdAt'>): WebhookConfig {
    const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const webhook: WebhookConfig = {
      ...config,
      id,
      createdAt: new Date().toISOString(),
    };
    this.webhooks.set(id, webhook);
    return webhook;
  }

  findAll(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  findById(id: string): WebhookConfig | undefined {
    return this.webhooks.get(id);
  }

  delete(id: string): boolean {
    return this.webhooks.delete(id);
  }

  async deliver(event: GlobalEvent): Promise<void> {
    const matching = Array.from(this.webhooks.values()).filter((wh) => {
      if (!wh.active) return false;
      if (event.riskLevel < wh.minRiskLevel) return false;
      if (wh.events.length > 0 && !wh.events.includes(event.category)) return false;
      if (wh.countries.length > 0 && event.countryCode && !wh.countries.includes(event.countryCode)) return false;
      return true;
    });

    for (const webhook of matching) {
      await this.sendDelivery(webhook, event);
    }
  }

  private async sendDelivery(webhook: WebhookConfig, event: GlobalEvent): Promise<void> {
    const delivery: WebhookDelivery = {
      id: `del_${Date.now()}`,
      webhookId: webhook.id,
      eventId: event.id,
      status: 'pending',
      attempts: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SentinelGlobal-Webhook/1.0',
        'X-Sentinel-Event': event.id,
      };

      if (webhook.secret) {
        headers['X-Signature'] = webhook.secret;
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: {
            id: event.id,
            title: event.title,
            category: event.category,
            subType: event.subType,
            riskScore: event.riskScore,
            riskLevel: event.riskLevel,
            location: event.location,
            locationName: event.locationName,
            countryCode: event.countryCode,
            timestamp: event.timestamp,
            impact: event.impact,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      delivery.status = response.ok ? 'delivered' : 'failed';
      delivery.attempts = 1;
    } catch {
      delivery.status = 'failed';
      delivery.attempts = 1;
    }

    this.deliveries.push(delivery);
    if (this.deliveries.length > 1000) {
      this.deliveries = this.deliveries.slice(-1000);
    }
  }

  getDeliveries(webhookId: string): WebhookDelivery[] {
    return this.deliveries.filter((d) => d.webhookId === webhookId);
  }
}
