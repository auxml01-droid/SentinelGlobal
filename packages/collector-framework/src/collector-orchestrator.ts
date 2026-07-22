import { GlobalEvent, CollectorSource } from '@sentinel/types';
import { EventBus, EventBusChannel } from '@sentinel/event-bus';
import { BaseCollector, CollectorHealthStatus } from './base-collector.js';

export interface OrchestratorConfig {
  eventBus: EventBus;
  onEvent?: (event: GlobalEvent) => void | Promise<void>;
  onHealthChange?: (health: CollectorHealthStatus) => void | Promise<void>;
}

export class CollectorOrchestrator {
  private collectors: Map<CollectorSource, BaseCollector> = new Map();
  private eventBus: EventBus;
  private onEvent?: (event: GlobalEvent) => void | Promise<void>;
  private onHealthChange?: (health: CollectorHealthStatus) => void | Promise<void>;

  constructor(config: OrchestratorConfig) {
    this.eventBus = config.eventBus;
    this.onEvent = config.onEvent;
    this.onHealthChange = config.onHealthChange;
  }

  register(collector: BaseCollector): void {
    this.collectors.set(collector.source, collector);
  }

  unregister(source: CollectorSource): void {
    const collector = this.collectors.get(source);
    if (collector) {
      collector.stop();
      this.collectors.delete(source);
    }
  }

  getCollector(source: CollectorSource): BaseCollector | undefined {
    return this.collectors.get(source);
  }

  getAllHealth(): CollectorHealthStatus[] {
    const statuses: CollectorHealthStatus[] = [];
    for (const collector of this.collectors.values()) {
      statuses.push(collector.health);
    }
    return statuses;
  }

  start(): void {
    for (const [, collector] of this.collectors) {
      collector.start();
    }
    this.startHealthMonitor();
  }

  stop(): void {
    for (const [, collector] of this.collectors) {
      collector.stop();
    }
  }

  private async publishEvents(events: GlobalEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventBus.publish(EventBusChannel.EVENTS_NEW, event);
      if (this.onEvent) {
        await this.onEvent(event);
      }
    }
  }

  private startHealthMonitor(): void {
    setInterval(async () => {
      for (const collector of this.collectors.values()) {
        const health = collector.health;
        await this.eventBus.publish(EventBusChannel.COLLECTOR_HEALTH, health);
        if (this.onHealthChange) {
          await this.onHealthChange(health);
        }
      }
    }, 5000);
  }

  // Wraps a collector's run() to publish via event bus
  async attachCollector(collector: BaseCollector): Promise<void> {
    const originalRun = collector['run'].bind(collector);
    const self = this;

    (collector as any).run = async function () {
      try {
        const events = await collector.collect();
        await self.publishEvents(events);
      } catch (error) {
        console.error(`[${collector.name}] Erro:`, error);
      }
    };

    this.register(collector);
  }
}
