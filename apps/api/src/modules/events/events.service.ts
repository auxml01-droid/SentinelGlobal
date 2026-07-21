import { Injectable } from '@nestjs/common';
import { GlobalEvent, EventCategory, EventSubType, EventStatus } from '@sentinel/types';

@Injectable()
export class EventsService {
  private events: Map<string, GlobalEvent> = new Map();

  create(event: GlobalEvent): GlobalEvent {
    this.events.set(event.id, event);
    return event;
  }

  findAll(filters?: {
    category?: EventCategory;
    subType?: EventSubType;
    countryCode?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): GlobalEvent[] {
    let result = Array.from(this.events.values());

    if (filters?.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters?.subType) {
      result = result.filter((e) => e.subType === filters.subType);
    }
    if (filters?.countryCode) {
      result = result.filter((e) => e.countryCode === filters.countryCode);
    }
    if (filters?.status) {
      result = result.filter((e) => e.status === filters.status);
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 100;

    return result.slice(offset, offset + limit);
  }

  findById(id: string): GlobalEvent | undefined {
    return this.events.get(id);
  }

  getActiveCount(): number {
    return Array.from(this.events.values()).filter((e) => e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED).length;
  }

  getStats(): {
    byCategory: Record<string, number>;
    total: number;
  } {
    const values = Array.from(this.events.values());
    const byCategory: Record<string, number> = {};

    for (const event of values) {
      byCategory[event.category] = (byCategory[event.category] ?? 0) + 1;
    }

    return { byCategory, total: values.length };
  }
}
