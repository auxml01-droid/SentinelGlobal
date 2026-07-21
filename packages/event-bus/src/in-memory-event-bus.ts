import { EventBus, EventBusChannel, EventHandler } from './event-bus';

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private latencyBase = 1;

  async publish<T>(channel: EventBusChannel, data: T): Promise<void> {
    const ch = channel as string;
    const handlers = this.handlers.get(ch);
    if (handlers) {
      const promises: Promise<void>[] = [];
      for (const handler of handlers) {
        const result = handler(data, channel);
        if (result instanceof Promise) {
          promises.push(result);
        }
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }
  }

  async subscribe<T>(channel: EventBusChannel, handler: EventHandler<T>): Promise<void> {
    const ch = channel as string;
    if (!this.handlers.has(ch)) {
      this.handlers.set(ch, new Set());
    }
    this.handlers.get(ch)!.add(handler as EventHandler);
  }

  async unsubscribe(channel: EventBusChannel, handler: EventHandler): Promise<void> {
    const ch = channel as string;
    const handlers = this.handlers.get(ch);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(ch);
      }
    }
  }

  async health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    return { status: 'healthy', latencyMs: this.latencyBase };
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}
