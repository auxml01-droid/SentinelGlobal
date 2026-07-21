import { EventLifecycle, EventStatus, GlobalEvent } from '@sentinel/types';

export class EventLifecycleManager {
  private events: Map<string, GlobalEvent> = new Map();
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  initLifecycle(): EventLifecycle {
    const now = new Date().toISOString();
    return { created: now, updated: now };
  }

  markUpdated(event: GlobalEvent): void {
    const now = new Date().toISOString();
    event.status = EventStatus.UPDATED;
    event.updatedAt = now;
    event.lifecycle.updated = now;
    this.events.set(event.id, event);
  }

  markResolved(event: GlobalEvent): void {
    const now = new Date().toISOString();
    event.status = EventStatus.RESOLVED;
    event.updatedAt = now;
    event.lifecycle.resolved = now;
    this.events.set(event.id, event);
  }

  markExpired(event: GlobalEvent): void {
    const now = new Date().toISOString();
    event.status = EventStatus.EXPIRED;
    event.updatedAt = now;
    event.lifecycle.expired = now;
    this.events.set(event.id, event);
  }

  markArchived(event: GlobalEvent): void {
    const now = new Date().toISOString();
    event.status = EventStatus.ARCHIVED;
    event.updatedAt = now;
    event.lifecycle.archived = now;
    this.events.set(event.id, event);
  }

  scheduleAutoExpire(event: GlobalEvent, maxAgeMs: number = 86400000): void {
    const existing = this.timeouts.get(event.id);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      if (event.status === EventStatus.CREATED || event.status === EventStatus.UPDATED) {
        this.markExpired(event);
      }
      this.timeouts.delete(event.id);
    }, maxAgeMs);

    this.timeouts.set(event.id, timeout);
  }

  getStatusTimeline(eventId: string): { status: EventStatus; timestamp: string }[] {
    const event = this.events.get(eventId);
    if (!event) return [];

    const timeline: { status: EventStatus; timestamp: string }[] = [];
    const lc = event.lifecycle;

    timeline.push({ status: EventStatus.CREATED, timestamp: lc.created });
    if (lc.updated) timeline.push({ status: EventStatus.UPDATED, timestamp: lc.updated });
    if (lc.resolved) timeline.push({ status: EventStatus.RESOLVED, timestamp: lc.resolved });
    if (lc.expired) timeline.push({ status: EventStatus.EXPIRED, timestamp: lc.expired });
    if (lc.archived) timeline.push({ status: EventStatus.ARCHIVED, timestamp: lc.archived });

    return timeline;
  }

  cleanup(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.events.clear();
  }
}
