import { BaseProvider } from './base-provider';
import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult, DiscordConfig } from '../types';

export class DiscordProvider extends BaseProvider {
  private config: DiscordConfig;

  constructor(config: DiscordConfig) {
    super(NotificationChannel.DISCORD);
    this.config = config;
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      const color = params.priority === 'critical' ? 0xa855f7 :
                    params.priority === 'high' ? 0xef4444 :
                    params.priority === 'normal' ? 0xf97316 : 0xeab308;

      const embed = {
        title: params.title,
        description: params.body,
        color,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'SentinelGlobal — Centro de Monitoramento',
          icon_url: 'https://i.imgur.com/6RZ7w9S.png',
        },
        fields: params.data
          ? Object.entries(params.data).map(([name, value]) => ({
              name,
              value: String(value),
              inline: true,
            }))
          : [],
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [embed],
          username: 'SentinelGlobal',
          avatar_url: 'https://i.imgur.com/6RZ7w9S.png',
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return this.createResult(false, undefined, `Discord error: ${err}`);
      }

      return this.createResult(true, `discord-${Date.now()}`);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro ao enviar Discord',
      );
    }
  }
}
