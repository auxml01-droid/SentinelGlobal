import { Injectable } from '@nestjs/common';
import { IntelligenceEngine, IntelligenceReport, EventExplanation } from '@sentinel/ai-engine';
import { GlobalEvent } from '@sentinel/types';

@Injectable()
export class IntelligenceService {
  private engine: IntelligenceEngine;

  constructor() {
    this.engine = new IntelligenceEngine();
  }

  processEvent(event: GlobalEvent): void {
    this.engine.processEvent(event);
  }

  generateReport(): IntelligenceReport {
    return this.engine.generateReport();
  }

  explainEvent(eventId: string): EventExplanation | null {
    return this.engine.explainEvent(eventId);
  }

  getEventHistory(): GlobalEvent[] {
    return this.engine.getEventHistory();
  }

  getStats(): {
    eventCount: number;
    correlations: number;
    clusters: number;
  } {
    const corrStats = this.engine.getCorrelationEngine().getStats();
    const kgStats = this.engine.getKnowledgeGraph().getStats();
    return {
      eventCount: this.engine.getEventHistory().length,
      correlations: corrStats.totalCorrelations,
      clusters: corrStats.totalClusters,
    };
  }
}
