import { GlobalEvent, RiskLevel } from '@sentinel/types';
import { ScoreWeights } from './weighted-scorer';

export interface EngineConfig {
  updateIntervalMs: number;
  countryScoreDecayMs: number;
  maxHistoricalEvents: number;
  scoreWeights?: ScoreWeights;
}

export interface CountryRiskCalc {
  countryCode: string;
  events: GlobalEvent[];
  score: number;
  level: RiskLevel;
  trend: 'up' | 'down' | 'stable';
  topEventIds: string[];
}

export interface RiskCalculationResult {
  globalScore: number;
  globalLevel: RiskLevel;
  countries: CountryRiskCalc[];
  updatedAt: string;
  eventCount: number;
  totalEvents: number;
}

export interface CountryEventHistory {
  lastScore: number;
  lastUpdated: number;
}
