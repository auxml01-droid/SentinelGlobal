import { BaseProvider } from './base-provider.js';
import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult, SlackConfig } from '../types.js';

export class SlackProvider extends BaseProvider {
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    super(NotificationChannel.SLACK);
    this.config = config;
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      const color = params.priority === 'critical' ? '#a855f7' :
                    params.priority === 'high' ? '#ef4444' :
                    params.priority === 'normal' ? '#f97316' : '#eab308';

      const blocks: Record<string, unknown>[] = [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🛰️ ${params.title}`, emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: params.body },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*SentinelGlobal* | ${new Date().toLocaleString('pt-BR')} | Prioridade: ${params.priority}`,
            },
          ],
        },
        {
          type: 'divider',
        },
      ];

      if (params.data) {
        const fields = Object.entries(params.data).map(([name, value]) => ({
          type: 'mrkdwn' as const,
          text: `*${name}:* ${value}`,
        }));
        blocks.push({ type: 'section', fields });
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${params.title}: ${params.body}`,
          blocks,
          attachments: [
            {
              color,
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return this.createResult(false, undefined, `Slack error: ${err}`);
      }

      return this.createResult(true, `slack-${Date.now()}`);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro ao enviar Slack',
      );
    }
  }
}
