import { BaseProvider } from './base-provider';
import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult, WhatsAppConfig } from '../types';

export class WhatsAppProvider extends BaseProvider {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    super(NotificationChannel.WHATSAPP);
    this.config = config;
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      if (this.config.provider === 'twilio') {
        return await this.sendViaTwilio(params);
      }

      return await this.sendViaDialog360(params);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro ao enviar WhatsApp',
      );
    }
  }

  private async sendViaTwilio(params: SendParams): Promise<SendResult> {
    const accountSid = this.config.accountSid;
    const authToken = this.config.authToken;

    if (!accountSid || !authToken) {
      return this.createResult(false, undefined, 'Twilio não configurado');
    }

    const to = Array.isArray(params.to) ? params.to[0] : params.to;
    const body = `🛰️ *SentinelGlobal*\n\n*${params.title}*\n${params.body}\n\n🔴 Risco: ${params.priority === 'critical' ? 'Crítico' : params.priority === 'high' ? 'Alto' : 'Moderado'}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${to}`,
          From: `whatsapp:${this.config.fromNumber}`,
          Body: body,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      return this.createResult(false, undefined, `Twilio error: ${err}`);
    }

    return this.createResult(true, `twilio-${Date.now()}`);
  }

  private async sendViaDialog360(params: SendParams): Promise<SendResult> {
    const apiKey = this.config.apiKey;

    if (!apiKey) {
      return this.createResult(false, undefined, '360Dialog não configurado');
    }

    const to = Array.isArray(params.to) ? params.to[0] : params.to;

    const response = await fetch(
      'https://waba.360dialog.io/v1/messages',
      {
        method: 'POST',
        headers: {
          'D360-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          type: 'text',
          text: {
            body: `🛰️ SentinelGlobal\n\n${params.title}\n${params.body}`,
          },
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      return this.createResult(false, undefined, `360Dialog error: ${err}`);
    }

    return this.createResult(true, `360-${Date.now()}`);
  }
}
