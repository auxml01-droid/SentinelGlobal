export enum AIAgentType {
  EARTHQUAKE = 'earthquake',
  WEATHER = 'weather',
  WAR = 'war',
  FIRE = 'fire',
  HEALTH = 'health',
  NUCLEAR = 'nuclear',
  CYBER = 'cyber',
  NEWS = 'news',
  SATELLITE = 'satellite',
  PREDICTION = 'prediction',
  CENTRAL = 'central',
}

export interface AIAnalysis {
  id: string;
  agentType: AIAgentType;
  title: string;
  summary: string;
  confidence: number;
  predictions?: AIPrediction[];
  recommendations?: string[];
  relatedEvents: string[];
  timestamp: string;
  expiresAt?: string;
}

export interface AIPrediction {
  eventType: string;
  probability: number;
  timeframe: string;
  region?: string;
  description: string;
  severity: number;
}

export interface AIQuery {
  query: string;
  context?: {
    timeRange?: string;
    countries?: string[];
    categories?: string[];
  };
}

export interface AIResponse {
  answer: string;
  sources: string[];
  confidence: number;
  analysisId?: string;
}
