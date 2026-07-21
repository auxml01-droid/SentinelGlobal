import { AIAgentType, AIAnalysis, GlobalEvent } from '@sentinel/types';

export interface AgentContext {
  events: GlobalEvent[];
  history: AIAnalysis[];
  timeRange: number;
}

export interface AgentResult {
  analysis: AIAnalysis;
  confidence: number;
}

export interface CentralAgentResult {
  summary: string;
  globalAssessment: string;
  predictions: AIAnalysis[];
  timestamp: string;
}
