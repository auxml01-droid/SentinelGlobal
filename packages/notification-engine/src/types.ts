import { NotificationChannel } from '@sentinel/types';

export interface NotificationConfig {
  email?: EmailConfig;
  whatsapp?: WhatsAppConfig;
  push?: PushConfig;
  telegram?: TelegramConfig;
  discord?: DiscordConfig;
  slack?: SlackConfig;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  provider: 'smtp' | 'gmail' | 'amazon_ses';
}

export interface WhatsAppConfig {
  provider: 'twilio' | 'dialog_360';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  apiKey?: string;
}

export interface PushConfig {
  provider: 'fcm' | 'one_signal' | 'web_push';
  serverKey?: string;
  appId?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId?: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface SlackConfig {
  webhookUrl: string;
}

export interface SendParams {
  channel: NotificationChannel;
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
