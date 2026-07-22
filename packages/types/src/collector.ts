import { EventCategory, EventSubType, GlobalEvent } from './event.js';

export type CollectorSource =
  | 'usgs'
  | 'emsc'
  | 'smithsonian_volcano'
  | 'noaa'
  | 'ecmwf'
  | 'openweather'
  | 'meteostat'
  | 'nhc'
  | 'nasa_firms'
  | 'ptwc'
  | 'acled'
  | 'gdelt'
  | 'liveuamap'
  | 'reuters'
  | 'ap'
  | 'bbc'
  | 'cnn'
  | 'aljazeera'
  | 'who'
  | 'cdc'
  | 'nasa'
  | 'esa';

export interface CollectorConfig {
  name: string;
  source: CollectorSource;
  category: EventCategory;
  subTypes: EventSubType[];
  enabled: boolean;
  intervalMs: number;
  apiKey?: string;
  baseUrl: string;
}

export interface CollectorResult {
  source: CollectorSource;
  events: GlobalEvent[];
  fetchedAt: string;
  success: boolean;
  error?: string;
}

export interface CollectorMetrics {
  source: CollectorSource;
  totalFetched: number;
  totalErrors: number;
  lastFetchAt?: string;
  lastSuccessAt?: string;
  avgResponseTimeMs: number;
  uptime: number;
}
