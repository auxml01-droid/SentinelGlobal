import { BaseProvider } from './base-provider';
import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult, PushConfig } from '../types';

export class PushProvider extends BaseProvider {
  private config: PushConfig;

  constructor(config: PushConfig) {
    super(NotificationChannel.PUSH);
    this.config = config;
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      switch (this.config.provider) {
        case 'fcm':
          return await this.sendViaFCM(params);
        case 'one_signal':
          return await this.sendViaOneSignal(params);
        case 'web_push':
          return this.createResult(true, `webpush-${Date.now()}`);
        default:
          return this.createResult(false, undefined, `Provider não suportado: ${this.config.provider}`);
      }
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro ao enviar push',
      );
    }
  }

  private async sendViaFCM(params: SendParams): Promise<SendResult> {
    const serverKey = this.config.serverKey;
    if (!serverKey) return this.createResult(false, undefined, 'FCM não configurado');

    const to = Array.isArray(params.to) ? params.to : [params.to];

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registration_ids: to,
        notification: {
          title: params.title,
          body: params.body,
          sound: params.priority === 'critical' ? 'alarm' : 'default',
          priority: params.priority === 'critical' ? 'high' : 'normal',
        },
        data: params.data || {},
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return this.createResult(false, undefined, `FCM error: ${err}`);
    }

    return this.createResult(true, `fcm-${Date.now()}`);
  }

  private async sendViaOneSignal(params: SendParams): Promise<SendResult> {
    const appId = this.config.appId;
    const apiKey = this.config.serverKey;

    if (!appId || !apiKey) {
      return this.createResult(false, undefined, 'OneSignal não configurado');
    }

    const to = Array.isArray(params.to) ? params.to : [params.to];

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: to,
        headings: { en: params.title },
        contents: { en: params.body },
        priority: params.priority === 'critical' ? 10 : 5,
        data: params.data || {},
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return this.createResult(false, undefined, `OneSignal error: ${err}`);
    }

    return this.createResult(true, `onesignal-${Date.now()}`);
  }
}
