export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface TimeRangeParams {
  startDate?: string;
  endDate?: string;
  range?: '5m' | '1h' | '24h' | '7d' | '30d';
}

export interface EventFilters extends PaginationParams, TimeRangeParams {
  category?: string;
  country?: string;
  subType?: string;
  minRisk?: number;
  maxRisk?: number;
  status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    total: number;
    offset: number;
    limit: number;
  };
  timestamp: string;
}

export interface RiskSummary {
  globalScore: number;
  globalLevel: number;
  totalEvents: number;
  activeEvents: number;
  countriesMonitored: number;
  topRisks: Array<{ country: string; score: number }>;
}

export interface WebhookConfig {
  id?: string;
  url: string;
  events: string[];
  minRiskLevel?: number;
  countries?: string[];
  active?: boolean;
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  status: 'delivered' | 'failed' | 'pending';
  attempts: number;
  timestamp: string;
}
