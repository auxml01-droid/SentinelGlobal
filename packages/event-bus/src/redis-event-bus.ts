import Redis from 'ioredis';
import { EventBus, EventBusChannel, EventBusConfig, EventHandler } from './event-bus';

export class RedisEventBus implements EventBus {
  private pub: Redis;
  private sub: Redis;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private prefix: string;

  constructor(config: EventBusConfig = {}) {
    const host = config.host || 'localhost';
    const port = config.port || 6379;
    this.prefix = config.prefix || 'sentinel';
    this.pub = new Redis({ host, port, lazyConnect: true });
    this.sub = new Redis({ host, port, lazyConnect: true });

    this.sub.on('message', (channel: string, message: string) => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        for (const handler of handlers) {
          try {
            const parsed = JSON.parse(message);
            handler(parsed, channel as EventBusChannel);
          } catch (err) {
            console.error(`[EventBus] Erro ao processar mensagem do canal ${channel}:`, err);
          }
        }
      }
    });
  }

  private channelName(channel: EventBusChannel): string {
    return `${this.prefix}:${channel}`;
  }

  async publish<T>(channel: EventBusChannel, data: T): Promise<void> {
    const ch = this.channelName(channel);
    const message = JSON.stringify(data);
    await this.pub.publish(ch, message);
  }

  async subscribe<T>(channel: EventBusChannel, handler: EventHandler<T>): Promise<void> {
    const ch = this.channelName(channel);
    if (!this.handlers.has(ch)) {
      this.handlers.set(ch, new Set());
      await this.sub.subscribe(ch);
    }
    this.handlers.get(ch)!.add(handler as EventHandler);
  }

  async unsubscribe(channel: EventBusChannel, handler: EventHandler): Promise<void> {
    const ch = this.channelName(channel);
    const handlers = this.handlers.get(ch);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(ch);
        await this.sub.unsubscribe(ch);
      }
    }
  }

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.pub.ping();
      const latencyMs = Date.now() - start;
      return { status: latencyMs > 100 ? 'degraded' : 'healthy', latencyMs };
    } catch {
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  async close(): Promise<void> {
    this.pub.disconnect();
    this.sub.disconnect();
  }
}
