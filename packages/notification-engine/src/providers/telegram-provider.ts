import { BaseProvider } from './base-provider.js';
import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult, TelegramConfig } from '../types.js';

export class TelegramProvider extends BaseProvider {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    super(NotificationChannel.TELEGRAM);
    this.config = config;
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      const botToken = this.config.botToken;
      if (!botToken) return this.createResult(false, undefined, 'Telegram bot não configurado');

      const chatId = Array.isArray(params.to) ? params.to[0] : params.to;

      const emoji = params.priority === 'critical' ? '🚨' :
                    params.priority === 'high' ? '🔴' :
                    params.priority === 'normal' ? '🟠' : '🟡';

      const text = `${emoji} *SentinelGlobal*\n\n*${params.title}*\n${params.body}\n\n_⚠️ Alerta automático — ${new Date().toLocaleString('pt-BR')}_`;

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        return this.createResult(false, undefined, `Telegram error: ${err}`);
      }

      return this.createResult(true, `tg-${Date.now()}`);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro ao enviar Telegram',
      );
    }
  }
}
