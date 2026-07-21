import { Module } from '@nestjs/common';
import { EventsModule } from './modules/events/events.module';
import { RiskModule } from './modules/risk/risk.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { PublicModule } from './modules/public/public.module';
import { HistoryModule } from './modules/history/history.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    EventsModule,
    RiskModule,
    WebSocketModule,
    NotificationsModule,
    AiModule,
    ApiKeysModule,
    PublicModule,
    HistoryModule,
    WebhooksModule,
  ],
})
export class AppModule {}
