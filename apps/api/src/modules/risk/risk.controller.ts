import { Controller, Get, Param } from '@nestjs/common';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get()
  getGlobalScore() {
    return this.riskService.getGlobalScore();
  }

  @Get('country/:code')
  getCountryScore(@Param('code') code: string) {
    return this.riskService.getCountryScore(code);
  }
}
