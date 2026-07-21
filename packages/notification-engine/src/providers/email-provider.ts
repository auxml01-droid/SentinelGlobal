import { BaseProvider } from './base-provider';
import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult, EmailConfig } from '../types';
import nodemailer from 'nodemailer';

export class EmailProvider extends BaseProvider {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(config: EmailConfig) {
    super(NotificationChannel.EMAIL);
    this.from = config.from;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      const to = Array.isArray(params.to) ? params.to.join(', ') : params.to;

      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: params.title,
        html: this.buildHtml(params),
        priority: params.priority === 'critical' ? 'high' : 'normal',
      });

      return this.createResult(true, info.messageId);
    } catch (error) {
      return this.createResult(
        false,
        undefined,
        error instanceof Error ? error.message : 'Erro ao enviar email',
      );
    }
  }

  private buildHtml(params: SendParams): string {
    const riskColor = this.getRiskColor(params.priority);

    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: 'Inter', sans-serif; background: #0a0a0f; color: #e8e8f0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #12121a; border: 1px solid #25253d; border-radius: 12px; padding: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <span style="font-size: 32px;">🛰️</span>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #ffffff;">
              SENTINEL<span style="color: #60a5fa;">GLOBAL</span>
            </h1>
          </div>
          <div style="border-left: 4px solid ${riskColor}; padding-left: 16px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px; font-size: 18px; color: #ffffff;">${params.title}</h2>
            <p style="margin: 0; color: #9393b0; font-size: 14px; line-height: 1.6;">${params.body}</p>
          </div>
          ${params.data ? `<pre style="background: #1a1a2e; padding: 12px; border-radius: 8px; font-size: 12px; color: #6b6b8a; overflow-x: auto;">${JSON.stringify(params.data, null, 2)}</pre>` : ''}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #25253d; font-size: 12px; color: #4a4a6a; text-align: center;">
            <p>SentinelGlobal — Centro de Monitoramento de Riscos</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getRiskColor(priority?: string): string {
    switch (priority) {
      case 'critical': return '#a855f7';
      case 'high': return '#ef4444';
      case 'normal': return '#f97316';
      default: return '#eab308';
    }
  }
}
