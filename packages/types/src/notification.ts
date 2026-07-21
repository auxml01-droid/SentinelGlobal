import { EventCategory, EventSubType } from './event';
import { RiskLevel } from './risk-level';

export enum NotificationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack',
}

export enum NotificationProvider {
  SMTP = 'smtp',
  GMAIL = 'gmail',
  AMAZON_SES = 'amazon_ses',
  TWILIO = 'twilio',
  DIALOG_360 = 'dialog_360',
  FCM = 'fcm',
  ONE_SIGNAL = 'one_signal',
  WEB_PUSH = 'web_push',
  TELEGRAM_BOT = 'telegram_bot',
  DISCORD_WEBHOOK = 'discord_webhook',
  SLACK_WEBHOOK = 'slack_webhook',
}

export interface UserNotificationPreferences {
  userId: string;
  categories: EventCategory[];
  subTypes: EventSubType[];
  minRiskLevel: RiskLevel;
  countries: string[];
  regions: string[];
  channels: NotificationChannel[];
  quietHours?: {
    start: string;
    end: string;
  };
}

export interface NotificationMessage {
  id: string;
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  eventId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}
