import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventCategory, EventSubType } from '@sentinel/types';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(
    @Query('category') category?: EventCategory,
    @Query('subType') subType?: EventSubType,
    @Query('country') country?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.eventsService.findAll({ category, subType, countryCode: country, status, limit, offset });
  }

  @Get('stats')
  getStats() {
    return this.eventsService.getStats();
  }

  @Get('active')
  getActiveCount() {
    return { count: this.eventsService.getActiveCount() };
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }
}
