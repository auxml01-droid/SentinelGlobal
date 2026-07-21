import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { NotificationManager } from '@sentinel/notification-engine';
import { NotificationChannel, GlobalEvent, UserNotificationPreferences, RiskLevel } from '@sentinel/types';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

const notificationManager = new NotificationManager({
  email: process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@sentinelglobal.io',
    provider: 'smtp',
  } : undefined,
  whatsapp: process.env.TWILIO_ACCOUNT_SID ? {
    provider: 'twilio',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  } : undefined,
  push: process.env.FCM_SERVER_KEY ? {
    provider: 'fcm',
    serverKey: process.env.FCM_SERVER_KEY,
  } : undefined,
  telegram: process.env.TELEGRAM_BOT_TOKEN ? {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  } : undefined,
  discord: process.env.DISCORD_WEBHOOK_URL ? {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  } : undefined,
  slack: process.env.SLACK_WEBHOOK_URL ? {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  } : undefined,
});

console.log('🔔 SentinelGlobal Notifications Worker');
console.log(`   Canais disponíveis: ${notificationManager.getAvailableChannels().join(', ') || 'nenhum (apenas log)'}`);

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { channel, to, title, body, data, priority } = job.data;

    try {
      if (channel && notificationManager.isChannelAvailable(channel)) {
        const result = await notificationManager.send({
          channel: channel as NotificationChannel,
          to,
          title,
          body,
          data,
          priority,
        });

        if (!result.success) {
          console.error(`❌ [${channel}] Falha: ${result.error}`);
        } else {
          console.log(`✅ [${channel}] Enviado: ${title}`);
        }

        return result;
      }

      console.log(`📝 [LOG] ${channel || 'N/A'} — ${title}: ${body}`);
      return { success: true, messageId: `log-${Date.now()}` };
    } catch (error) {
      console.error(`❌ [${channel}] Erro:`, error);
      return { success: false, error: String(error) };
    }
  },
  { connection },
);

notificationWorker.on('completed', (job) => {
  const result = job.returnvalue;
  if (result?.success) return;
  console.warn(`⚠️ Job ${job.id} concluído com falha`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} falhou:`, err.message);
});

process.on('SIGTERM', async () => {
  await notificationWorker.close();
  await connection.quit();
});
