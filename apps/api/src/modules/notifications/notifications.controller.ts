import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UserNotificationPreferences, EventCategory, EventSubType, NotificationChannel, RiskLevel } from '@sentinel/types';

class UpsertPreferencesDto {
  categories?: EventCategory[];
  subTypes?: EventSubType[];
  minRiskLevel?: number;
  countries?: string[];
  regions?: string[];
  channels?: NotificationChannel[];
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get(':userId')
  getPreferences(@Param('userId') userId: string) {
    const prefs = this.service.getPreferences(userId);
    if (!prefs) return { preferences: null, message: 'Nenhuma preferência configurada' };
    return { preferences: prefs };
  }

  @Post(':userId')
  upsertPreferences(
    @Param('userId') userId: string,
    @Body() data: UpsertPreferencesDto,
  ) {
    const prefs = this.service.upsertPreferences(userId, data);
    return { preferences: prefs, message: 'Preferências atualizadas' };
  }

  @Delete(':userId')
  deletePreferences(@Param('userId') userId: string) {
    this.service.deletePreferences(userId);
    return { message: 'Preferências removidas' };
  }
}
