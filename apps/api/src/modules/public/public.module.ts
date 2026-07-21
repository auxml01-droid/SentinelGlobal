import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { EventsModule } from '../events/events.module';
import { RiskModule } from '../risk/risk.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [EventsModule, RiskModule, AiModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
