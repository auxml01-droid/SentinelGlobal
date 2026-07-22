import { NotificationChannel, GlobalEvent, UserNotificationPreferences, RiskLevel } from '@sentinel/types';
import { NotificationConfig, SendParams, SendResult } from './types.js';
import { BaseProvider } from './providers/base-provider.js';
import { EmailProvider } from './providers/email-provider.js';
import { WhatsAppProvider } from './providers/whatsapp-provider.js';
import { PushProvider } from './providers/push-provider.js';
import { TelegramProvider } from './providers/telegram-provider.js';
import { DiscordProvider } from './providers/discord-provider.js';
import { SlackProvider } from './providers/slack-provider.js';

export class NotificationManager {
  private providers: Map<NotificationChannel, BaseProvider> = new Map();

  constructor(config: NotificationConfig) {
    if (config.email) this.providers.set(NotificationChannel.EMAIL, new EmailProvider(config.email));
    if (config.whatsapp) this.providers.set(NotificationChannel.WHATSAPP, new WhatsAppProvider(config.whatsapp));
    if (config.push) this.providers.set(NotificationChannel.PUSH, new PushProvider(config.push));
    if (config.telegram) this.providers.set(NotificationChannel.TELEGRAM, new TelegramProvider(config.telegram));
    if (config.discord) this.providers.set(NotificationChannel.DISCORD, new DiscordProvider(config.discord));
    if (config.slack) this.providers.set(NotificationChannel.SLACK, new SlackProvider(config.slack));
  }

  async send(params: SendParams): Promise<SendResult> {
    const provider = this.providers.get(params.channel);
    if (!provider) {
      return { success: false, error: `Provider não configurado: ${params.channel}` };
    }

    try {
      return await provider.send(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async sendToUser(
    preferences: UserNotificationPreferences,
    event: GlobalEvent,
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];

    if (!this.shouldNotify(preferences, event)) return results;

    const title = `🚨 ${event.title}`;
    const body = `${event.locationName || 'Local desconhecido'} | Risco: ${event.riskScore}% | ${event.category}`;

    for (const channel of preferences.channels) {
      const result = await this.send({
        channel,
        to: preferences.userId,
        title,
        body,
        data: { eventId: event.id },
        priority: event.riskScore >= 80 ? 'critical' : event.riskScore >= 60 ? 'high' : 'normal',
      });
      results.push(result);
    }

    return results;
  }

  private shouldNotify(preferences: UserNotificationPreferences, event: GlobalEvent): boolean {
    if (preferences.categories.length > 0 && !preferences.categories.includes(event.category)) {
      return false;
    }

    if (preferences.subTypes.length > 0 && !preferences.subTypes.includes(event.subType)) {
      return false;
    }

    if (event.riskLevel < preferences.minRiskLevel) {
      return false;
    }

    if (preferences.countries.length > 0 && event.countryCode) {
      if (!preferences.countries.includes(event.countryCode)) {
        return false;
      }
    }

    return true;
  }

  isChannelAvailable(channel: NotificationChannel): boolean {
    return this.providers.has(channel);
  }

  getAvailableChannels(): NotificationChannel[] {
    return Array.from(this.providers.keys());
  }
}
