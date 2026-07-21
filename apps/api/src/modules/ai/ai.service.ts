import { Injectable } from '@nestjs/common';
import { GlobalEvent, AIResponse, AIQuery, AIAnalysis } from '@sentinel/types';
import { AIAnalyzer } from '@sentinel/ai-engine';

@Injectable()
export class AiService {
  private analyzer: AIAnalyzer;
  private analyses: AIAnalysis[] = [];

  constructor() {
    this.analyzer = new AIAnalyzer();
  }

  setEvents(events: GlobalEvent[]): void {
    if (events.length > 0) {
      this.analyzer.runAnalysis(events).then((results: AIAnalysis[]) => {
        this.analyses = results;
      });
    }
  }

  async query(query: AIQuery): Promise<AIResponse> {
    return this.analyzer.answerQuery(query);
  }

  getLatestAnalyses(): AIAnalysis[] {
    return this.analyses;
  }
}
