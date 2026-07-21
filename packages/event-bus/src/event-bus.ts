export enum EventBusChannel {
  EVENTS_NEW = 'events:new',
  EVENTS_UPDATED = 'events:updated',
  EVENTS_RESOLVED = 'events:resolved',
  EVENTS_EXPIRED = 'events:expired',
  RISK_UPDATES = 'risk:updates',
  AI_ANALYSES = 'ai:analyses',
  AI_PREDICTIONS = 'ai:predictions',
  NOTIFICATIONS = 'notifications',
  COLLECTOR_HEALTH = 'collector:health',
  SYSTEM_STATUS = 'system:status',
}

export interface EventBusConfig {
  host?: string;
  port?: number;
  prefix?: string;
}

export type EventHandler<T = unknown> = (data: T, channel: EventBusChannel) => void | Promise<void>;

export interface EventBus {
  publish<T>(channel: EventBusChannel, data: T): Promise<void>;
  subscribe<T>(channel: EventBusChannel, handler: EventHandler<T>): Promise<void>;
  unsubscribe(channel: EventBusChannel, handler: EventHandler): Promise<void>;
  health(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }>;
  close(): Promise<void>;
}
