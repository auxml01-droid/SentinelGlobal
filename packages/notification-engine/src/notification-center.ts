import { GlobalEvent, NotificationChannel, RiskLevel, EventCategory } from '@sentinel/types';
import { NotificationManager } from './notification-manager';
import { NotificationConfig, SendParams, SendResult } from './types';

export interface NotificationRule {
  id: string;
  name: string;
  categories?: EventCategory[];
  countries?: string[];
  minRiskLevel: RiskLevel;
  maxRiskLevel?: RiskLevel;
  channels: NotificationChannel[];
  active: boolean;
  createdAt: string;
}

export interface NotificationSubscriber {
  id: string;
  name: string;
  contacts: Partial<Record<NotificationChannel, string>>;
  rules: string[];
  active: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
  notificationCount: number;
}

export interface NotificationDelivery {
  id: string;
  subscriberId: string;
  ruleId: string;
  eventId: string;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed' | 'partial';
  results: SendResult[];
  timestamp: string;
  retryCount: number;
}

export class NotificationCenter {
  private manager: NotificationManager;
  private rules: Map<string, NotificationRule> = new Map();
  private subscribers: Map<string, NotificationSubscriber> = new Map();
  private deliveries: NotificationDelivery[] = [];
  private maxDeliveries = 10000;

  constructor(config: NotificationConfig) {
    this.manager = new NotificationManager(config);
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    this.addRule({
      id: 'default-critical',
      name: 'Eventos Críticos',
      minRiskLevel: RiskLevel.CRITICO,
      channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP, NotificationChannel.TELEGRAM],
      active: true,
    });
    this.addRule({
      id: 'default-high',
      name: 'Eventos de Alto Risco',
      minRiskLevel: RiskLevel.ALTO_RISCO,
      channels: [NotificationChannel.EMAIL, NotificationChannel.TELEGRAM],
      active: true,
    });
    this.addRule({
      id: 'default-alert',
      name: 'Alertas Moderados',
      minRiskLevel: RiskLevel.ALERTA,
      channels: [NotificationChannel.EMAIL],
      active: true,
    });
  }

  addRule(rule: Partial<NotificationRule> & { id: string; name: string; minRiskLevel: RiskLevel; channels: NotificationChannel[] }): NotificationRule {
    const full: NotificationRule = {
      ...rule,
      active: rule.active ?? true,
      createdAt: rule.createdAt ?? new Date().toISOString(),
    };
    this.rules.set(full.id, full);
    return full;
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): NotificationRule | undefined {
    return this.rules.get(ruleId);
  }

  listRules(): NotificationRule[] {
    return Array.from(this.rules.values());
  }

  addSubscriber(subscriber: NotificationSubscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
  }

  removeSubscriber(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId);
  }

  getSubscriber(subscriberId: string): NotificationSubscriber | undefined {
    return this.subscribers.get(subscriberId);
  }

  listSubscribers(): NotificationSubscriber[] {
    return Array.from(this.subscribers.values());
  }

  async processEvent(event: GlobalEvent): Promise<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];

    const matchingRules = Array.from(this.rules.values()).filter((rule) =>
      this.ruleMatches(rule, event),
    );

    for (const rule of matchingRules) {
      const matchingSubscribers = Array.from(this.subscribers.values()).filter((sub) =>
        sub.rules.includes(rule.id) && sub.active,
      );

      for (const subscriber of matchingSubscribers) {
        const delivery = await this.deliverToSubscriber(subscriber, rule, event);
        deliveries.push(delivery);
      }
    }

    return deliveries;
  }

  private ruleMatches(rule: NotificationRule, event: GlobalEvent): boolean {
    if (!rule.active) return false;
    if (rule.categories && rule.categories.length > 0 && !rule.categories.includes(event.category)) return false;
    if (rule.countries && rule.countries.length > 0 && event.countryCode && !rule.countries.includes(event.countryCode)) return false;
    if (event.riskLevel < rule.minRiskLevel) return false;
    if (rule.maxRiskLevel !== undefined && event.riskLevel > rule.maxRiskLevel) return false;
    return true;
  }

  private async deliverToSubscriber(
    subscriber: NotificationSubscriber,
    rule: NotificationRule,
    event: GlobalEvent,
  ): Promise<NotificationDelivery> {
    const deliveryId = `del_${Date.now()}_${subscriber.id}_${event.id}`;
    const results: SendResult[] = [];
    const channelsToUse = rule.channels.filter((ch) => subscriber.contacts[ch]);

    for (const channel of channelsToUse) {
      const to = subscriber.contacts[channel]!;
      const result = await this.manager.send({
        channel,
        to,
        title: `🚨 ${event.title}`,
        body: `${event.locationName || 'Local desconhecido'} | Risco: ${event.riskScore}% | ${event.category}`,
        data: {
          eventId: event.id,
          riskScore: event.riskScore,
          riskLevel: event.riskLevel,
          category: event.category,
          country: event.countryCode,
        },
        priority: event.riskScore >= 80 ? 'critical' : event.riskScore >= 60 ? 'high' : 'normal',
      });
      results.push(result);
    }

    const sentCount = results.filter((r) => r.success).length;
    const status = sentCount === channelsToUse.length
      ? 'sent'
      : sentCount > 0
        ? 'partial'
        : 'failed';

    subscriber.notificationCount++;
    subscriber.lastNotifiedAt = new Date().toISOString();

    const delivery: NotificationDelivery = {
      id: deliveryId,
      subscriberId: subscriber.id,
      ruleId: rule.id,
      eventId: event.id,
      channels: channelsToUse,
      status,
      results,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    this.deliveries.push(delivery);
    if (this.deliveries.length > this.maxDeliveries) {
      this.deliveries = this.deliveries.slice(-this.maxDeliveries);
    }

    return delivery;
  }

  getDeliveries(filters?: {
    subscriberId?: string;
    ruleId?: string;
    status?: string;
    limit?: number;
  }): NotificationDelivery[] {
    let result = this.deliveries;
    if (filters?.subscriberId) result = result.filter((d) => d.subscriberId === filters.subscriberId);
    if (filters?.ruleId) result = result.filter((d) => d.ruleId === filters.ruleId);
    if (filters?.status) result = result.filter((d) => d.status === filters.status);
    return result.slice(0, filters?.limit ?? 100);
  }

  getStats(): {
    totalDeliveries: number;
    sent: number;
    failed: number;
    partial: number;
    activeSubscribers: number;
    activeRules: number;
  } {
    const sent = this.deliveries.filter((d) => d.status === 'sent').length;
    const failed = this.deliveries.filter((d) => d.status === 'failed').length;
    const partial = this.deliveries.filter((d) => d.status === 'partial').length;

    return {
      totalDeliveries: this.deliveries.length,
      sent,
      failed,
      partial,
      activeSubscribers: Array.from(this.subscribers.values()).filter((s) => s.active).length,
      activeRules: Array.from(this.rules.values()).filter((r) => r.active).length,
    };
  }
}
