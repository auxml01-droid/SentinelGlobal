import { Injectable } from '@nestjs/common';
import { UserNotificationPreferences, EventCategory, EventSubType, NotificationChannel, RiskLevel } from '@sentinel/types';

@Injectable()
export class NotificationsService {
  private preferences: Map<string, UserNotificationPreferences> = new Map();

  getPreferences(userId: string): UserNotificationPreferences | null {
    return this.preferences.get(userId) ?? null;
  }

  upsertPreferences(
    userId: string,
    data: Partial<UserNotificationPreferences>,
  ): UserNotificationPreferences {
    const existing = this.preferences.get(userId) ?? {
      userId,
      categories: [],
      subTypes: [],
      minRiskLevel: RiskLevel.ATENCAO,
      countries: [],
      regions: [],
      channels: [],
    };

    const updated: UserNotificationPreferences = {
      ...existing,
      ...data,
      userId,
    };

    this.preferences.set(userId, updated);
    return updated;
  }

  deletePreferences(userId: string): boolean {
    return this.preferences.delete(userId);
  }

  getUsersForEvent(category: EventCategory, countryCode?: string): UserNotificationPreferences[] {
    const matches: UserNotificationPreferences[] = [];

    for (const prefs of this.preferences.values()) {
      if (prefs.categories.length > 0 && !prefs.categories.includes(category)) continue;
      if (prefs.countries.length > 0 && countryCode && !prefs.countries.includes(countryCode)) continue;
      matches.push(prefs);
    }

    return matches;
  }
}
