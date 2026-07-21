import { EventStatus } from '@sentinel/types';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { EventsService } from '../events/events.service';
import { RiskService } from '../risk/risk.service';
import { AiService } from '../ai/ai.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly eventsService: EventsService,
    private readonly riskService: RiskService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  getApiInfo() {
    return {
      name: 'SentinelGlobal API',
      version: '1.0.0',
      description: 'API pública de monitoramento global de riscos em tempo real',
      docs: '/public/docs',
      endpoints: {
        summary: 'GET /public/summary',
        risk: 'GET /public/risk',
        events: 'GET /public/events',
        event: 'GET /public/events/:id',
        timeline: 'GET /public/timeline/:range',
        country: 'GET /public/countries/:code',
        query: 'POST /public/ai/query',
      },
    };
  }

  @Get('summary')
  getSummary() {
    const events = this.eventsService.findAll();
    const risk = this.riskService.getGlobalScore();

    const active = events.filter((e) => e.status === EventStatus.CREATED || e.status === EventStatus.UPDATED).length;
    const topRisks = risk.countries
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((c) => ({ country: c.countryCode, score: c.score }));

    return {
      globalScore: risk.globalScore,
      globalLevel: risk.level,
      totalEvents: events.length,
      activeEvents: active,
      countriesMonitored: risk.countries.length,
      topRisks,
      lastUpdated: risk.updatedAt,
      version: '1.0.0',
    };
  }

  @Get('risk')
  getRisk() {
    const score = this.riskService.getGlobalScore();
    return this.publicService.formatScoreForPublic(score);
  }

  @Get('events')
  getEvents(
    @Query('category') category?: string,
    @Query('country') country?: string,
    @Query('minRisk') minRisk?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const events = this.eventsService.findAll({ category: category as any, countryCode: country, limit, offset });
    return {
      events: events.map((e) => this.publicService.formatEventForPublic(e)),
      total: events.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('events/:id')
  getEvent(@Param('id') id: string) {
    const event = this.eventsService.findById(id);
    if (!event) return { error: 'Evento não encontrado' };
    return this.publicService.formatEventForPublic(event);
  }

  @Get('timeline/:range')
  getTimeline(@Param('range') range: string) {
    const ranges: Record<string, number> = { '5m': 5, '1h': 60, '24h': 1440, '7d': 10080, '30d': 43200 };
    const minutes = ranges[range] ?? 60;

    const events = this.eventsService.findAll({ limit: 500 });

    const cutoff = Date.now() - minutes * 60 * 1000;
    const filtered = events.filter(
      (e) => new Date(e.timestamp).getTime() > cutoff,
    );

    return {
      range,
      events: filtered.map((e) => this.publicService.formatEventForPublic(e)),
      total: filtered.length,
    };
  }

  @Get('countries/:code')
  getCountry(@Param('code') code: string) {
    const score = this.riskService.getCountryScore(code);
    const events = this.eventsService.findAll({ countryCode: code, limit: 20 });

    return {
      countryCode: code,
      risk: score,
      events: events.map((e) => this.publicService.formatEventForPublic(e)),
    };
  }
}
