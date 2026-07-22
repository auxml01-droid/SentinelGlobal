import { Controller, Get, Param, Query } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('report')
  getReport() {
    return this.intelligenceService.generateReport();
  }

  @Get('event/:eventId')
  explainEvent(@Param('eventId') eventId: string) {
    const explanation = this.intelligenceService.explainEvent(eventId);
    if (!explanation) {
      return { error: 'Evento não encontrado' };
    }
    return explanation;
  }

  @Get('stats')
  getStats() {
    return this.intelligenceService.getStats();
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const events = this.intelligenceService.getEventHistory();
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return events.slice(-limitNum);
  }
}
