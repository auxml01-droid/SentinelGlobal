import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('timeline')
  getTimeline(@Query('range') range?: string): any {
    const ranges: Record<string, number> = { '5m': 5, '1h': 60, '24h': 1440, '7d': 10080, '30d': 43200 };
    const minutes = (range && ranges[range]) ? ranges[range]! : 60;
    return { range: range || '1h', points: this.service.getTimeline(minutes) };
  }

  @Get('country/:code')
  getCountryHistory(@Param('code') code: string, @Query('range') range?: string): any {
    const ranges: Record<string, number> = { '5m': 5, '1h': 60, '24h': 1440, '7d': 10080, '30d': 43200 };
    const minutes = (range && ranges[range]) ? ranges[range]! : 1440;
    const events = this.service.getCountryHistory(code, minutes);
    return { countryCode: code, range: range || '24h', events, total: events.length };
  }

  @Get('stats')
  getStats(): any {
    return this.service.getStats();
  }
}
