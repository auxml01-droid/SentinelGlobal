import { GlobalEvent } from './event';
import { GlobalRiskScore } from './risk-level';

export enum WSClientType {
  DASHBOARD = 'dashboard',
  MAP = 'map',
  MOBILE = 'mobile',
  EXTERNAL_API = 'external_api',
}

export enum WSEventType {
  NEW_EVENT = 'new_event',
  EVENT_UPDATE = 'event_update',
  EVENT_RESOLVED = 'event_resolved',
  RISK_SCORE_UPDATE = 'risk_score_update',
  COUNTRY_RISK_UPDATE = 'country_risk_update',
  AI_ANALYSIS = 'ai_analysis',
  SATELLITE_DATA = 'satellite_data',
  SYSTEM_STATUS = 'system_status',
}

export interface WSMessage {
  type: WSEventType;
  payload: unknown;
  timestamp: string;
}

export interface WSNewEventMessage extends WSMessage {
  type: WSEventType.NEW_EVENT;
  payload: GlobalEvent;
}

export interface WSRiskScoreMessage extends WSMessage {
  type: WSEventType.RISK_SCORE_UPDATE;
  payload: GlobalRiskScore;
}

export interface WSSubscription {
  clientId: string;
  clientType: WSClientType;
  categories?: string[];
  countries?: string[];
  minRiskLevel?: number;
}
