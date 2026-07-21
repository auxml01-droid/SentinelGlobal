import { Controller, Get, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { AIQuery } from '@sentinel/types';

class QueryDto {
  query!: string;
  context?: {
    timeRange?: string;
    countries?: string[];
    categories?: string[];
  };
}

@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('query')
  async query(@Body() body: QueryDto): Promise<any> {
    const response = await this.service.query({
      query: body.query,
      context: body.context,
    });
    return response;
  }

  @Get('analyses')
  getAnalyses() {
    return { analyses: this.service.getLatestAnalyses() };
  }
}
