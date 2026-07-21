import { RiskLevel } from './risk-level';

export enum EventCategory {
  NATURAL_DISASTER = 'natural_disaster',
  CONFLICT = 'conflict',
  TECH_RISK = 'tech_risk',
  HEALTH = 'health',
  TRANSPORT = 'transport',
}

export enum EventSubType {
  // Naturais
  EARTHQUAKE = 'earthquake',
  VOLCANO = 'volcano',
  TSUNAMI = 'tsunami',
  HURRICANE = 'hurricane',
  TORNADO = 'tornado',
  STORM = 'storm',
  LIGHTNING = 'lightning',
  WILDFIRE = 'wildfire',
  DROUGHT = 'drought',
  FLOOD = 'flood',
  HEAT_WAVE = 'heat_wave',
  BLIZZARD = 'blizzard',

  // Conflitos
  WAR = 'war',
  MILITARY_ATTACK = 'military_attack',
  BOMBING = 'bombing',
  MISSILE_LAUNCH = 'missile_launch',
  TERRORISM = 'terrorism',
  CYBER_ATTACK = 'cyber_attack',
  MILITARY_MOVEMENT = 'military_movement',
  MILITARY_EXERCISE = 'military_exercise',
  DIPLOMATIC_TENSION = 'diplomatic_tension',

  // Riscos tecnológicos
  NUCLEAR_LEAK = 'nuclear_leak',
  CHEMICAL_ACCIDENT = 'chemical_accident',
  DAM_BREACH = 'dam_breach',
  BLACKOUT = 'blackout',
  CRITICAL_INFRA_ATTACK = 'critical_infra_attack',

  // Saúde
  EPIDEMIC = 'epidemic',
  PANDEMIC = 'pandemic',
  WHO_ALERT = 'who_alert',
  NEW_VIRUS = 'new_virus',

  // Transporte
  AIR_CRASH = 'air_crash',
  MARITIME_COLLISION = 'maritime_collision',
  AIRPORT_CLOSURE = 'airport_closure',
  PORT_CLOSURE = 'port_closure',
}

export const CategorySubTypes: Record<EventCategory, EventSubType[]> = {
  [EventCategory.NATURAL_DISASTER]: [
    EventSubType.EARTHQUAKE,
    EventSubType.VOLCANO,
    EventSubType.TSUNAMI,
    EventSubType.HURRICANE,
    EventSubType.TORNADO,
    EventSubType.STORM,
    EventSubType.LIGHTNING,
    EventSubType.WILDFIRE,
    EventSubType.DROUGHT,
    EventSubType.FLOOD,
    EventSubType.HEAT_WAVE,
    EventSubType.BLIZZARD,
  ],
  [EventCategory.CONFLICT]: [
    EventSubType.WAR,
    EventSubType.MILITARY_ATTACK,
    EventSubType.BOMBING,
    EventSubType.MISSILE_LAUNCH,
    EventSubType.TERRORISM,
    EventSubType.CYBER_ATTACK,
    EventSubType.MILITARY_MOVEMENT,
    EventSubType.MILITARY_EXERCISE,
    EventSubType.DIPLOMATIC_TENSION,
  ],
  [EventCategory.TECH_RISK]: [
    EventSubType.NUCLEAR_LEAK,
    EventSubType.CHEMICAL_ACCIDENT,
    EventSubType.DAM_BREACH,
    EventSubType.BLACKOUT,
    EventSubType.CRITICAL_INFRA_ATTACK,
  ],
  [EventCategory.HEALTH]: [
    EventSubType.EPIDEMIC,
    EventSubType.PANDEMIC,
    EventSubType.WHO_ALERT,
    EventSubType.NEW_VIRUS,
  ],
  [EventCategory.TRANSPORT]: [
    EventSubType.AIR_CRASH,
    EventSubType.MARITIME_COLLISION,
    EventSubType.AIRPORT_CLOSURE,
    EventSubType.PORT_CLOSURE,
  ],
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface EventImpact {
  magnitude?: number;
  depth?: number;
  fatalities?: number;
  injured?: number;
  displaced?: number;
  affectedArea?: number;
  economicDamage?: number;
  radius?: number;
}

export enum EventStatus {
  CREATED = 'created',
  UPDATED = 'updated',
  RESOLVED = 'resolved',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
}

export interface EventLifecycle {
  created: string;
  updated: string;
  resolved?: string;
  expired?: string;
  archived?: string;
}

export interface EventPrediction {
  type: string;
  probability: number;
  confidence: number;
  estimatedAffected?: number;
  timeToEvent?: string;
}

export interface GlobalEvent {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  subType: EventSubType;
  location: GeoPoint;
  locationName?: string;
  countryCode?: string;
  countryName?: string;
  impact: EventImpact;
  riskScore: number;
  riskLevel: RiskLevel;
  source: string;
  sourceUrl?: string;
  timestamp: string;
  updatedAt: string;
  status: EventStatus;
  lifecycle: EventLifecycle;
  predictions?: EventPrediction[];
  relatedEvents?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}
