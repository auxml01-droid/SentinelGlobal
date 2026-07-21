import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WSEventType, WSSubscription, WSClientType, WSMessage } from '@sentinel/types';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private clients: Map<string, WSSubscription> = new Map();
  private redisSub!: Redis;

  afterInit(): void {
    this.redisSub = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });

    this.redisSub.subscribe('events:new', 'risk:updates', 'ai:analyses', (err: Error | null, count: number) => {
      if (err) {
        console.error('Erro ao subscrever Redis:', err);
        return;
      }
      console.log(`📡 API inscrita em ${count} canal(is) Redis`);
    });

    this.redisSub.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message) as WSMessage;

        switch (channel) {
          case 'events:new':
            this.broadcastNewEvent(data.payload);
            break;
          case 'risk:updates':
            this.broadcastRiskUpdate(data.payload);
            break;
          case 'ai:analyses':
            this.broadcastAI(data.payload);
            break;
        }
      } catch (error) {
        console.error(`Erro processando mensagem Redis [${channel}]:`, error);
      }
    });
  }

  handleConnection(client: Socket): void {
    console.log(`✅ Cliente conectado: ${client.id}`);
    this.clients.set(client.id, {
      clientId: client.id,
      clientType: WSClientType.DASHBOARD,
    });
  }

  handleDisconnect(client: Socket): void {
    console.log(`❌ Cliente desconectado: ${client.id}`);
    this.clients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: WSSubscription): void {
    this.clients.set(client.id, { ...payload, clientId: client.id });
    client.join(payload.countries?.map((c) => `country:${c}`) ?? []);
    client.join(payload.categories?.map((c) => `category:${c}`) ?? []);
    client.emit('subscribed', { success: true });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket): void {
    this.clients.delete(client.id);
    client.rooms.clear();
  }

  broadcastNewEvent(payload: unknown): void {
    this.server.emit('new_event', {
      type: WSEventType.NEW_EVENT,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastRiskUpdate(payload: unknown): void {
    this.server.emit('risk_update', {
      type: WSEventType.RISK_SCORE_UPDATE,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastAI(payload: unknown): void {
    this.server.emit('ai_analysis', {
      type: WSEventType.AI_ANALYSIS,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
