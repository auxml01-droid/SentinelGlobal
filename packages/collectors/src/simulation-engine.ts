import {
  GlobalEvent,
  EventCategory,
  EventSubType,
  EventStatus,
  RiskLevel,
  GeoPoint,
  CollectorSource,
} from '@sentinel/types';

interface SimulationConfig {
  intervalMs: number;
  eventsPerTick: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  intervalMs: 8000,
  eventsPerTick: 3,
};

const COUNTRIES = [
  { code: 'JP', name: 'Japão', lat: 36.2, lng: 138.25 },
  { code: 'US', name: 'Estados Unidos', lat: 37.09, lng: -95.71 },
  { code: 'IL', name: 'Israel', lat: 31.04, lng: 34.85 },
  { code: 'BR', name: 'Brasil', lat: -14.23, lng: -51.92 },
  { code: 'RU', name: 'Rússia', lat: 61.52, lng: 105.31 },
  { code: 'CN', name: 'China', lat: 35.86, lng: 104.19 },
  { code: 'ID', name: 'Indonésia', lat: -0.78, lng: 113.92 },
  { code: 'TR', name: 'Turquia', lat: 38.96, lng: 35.24 },
  { code: 'UA', name: 'Ucrânia', lat: 48.37, lng: 31.16 },
  { code: 'IR', name: 'Irã', lat: 32.42, lng: 53.68 },
];

const EVENT_TYPES: Array<{
  category: EventCategory;
  subType: EventSubType;
  titleGen: (country: string) => string;
  riskBase: number;
}> = [
  {
    category: EventCategory.NATURAL_DISASTER,
    subType: EventSubType.EARTHQUAKE,
    titleGen: (c) => `Terremoto M${(4 + Math.random() * 4).toFixed(1)} — ${c}`,
    riskBase: 55,
  },
  {
    category: EventCategory.NATURAL_DISASTER,
    subType: EventSubType.WILDFIRE,
    titleGen: (c) => `Incêndio florestal — ${c}`,
    riskBase: 50,
  },
  {
    category: EventCategory.NATURAL_DISASTER,
    subType: EventSubType.FLOOD,
    titleGen: (c) => `Enchete — ${c}`,
    riskBase: 45,
  },
  {
    category: EventCategory.NATURAL_DISASTER,
    subType: EventSubType.HURRICANE,
    titleGen: (c) => `Furacão Cat ${Math.floor(Math.random() * 3) + 1} — ${c}`,
    riskBase: 60,
  },
  {
    category: EventCategory.CONFLICT,
    subType: EventSubType.WAR,
    titleGen: (c) => `Conflito armado — ${c}`,
    riskBase: 75,
  },
  {
    category: EventCategory.CONFLICT,
    subType: EventSubType.MISSILE_LAUNCH,
    titleGen: (c) => `Lançamento de míssil — ${c}`,
    riskBase: 70,
  },
  {
    category: EventCategory.CONFLICT,
    subType: EventSubType.CYBER_ATTACK,
    titleGen: (c) => `Ataque cibernético — ${c}`,
    riskBase: 50,
  },
  {
    category: EventCategory.NATURAL_DISASTER,
    subType: EventSubType.VOLCANO,
    titleGen: (c) => `Atividade vulcânica — ${c}`,
    riskBase: 50,
  },
  {
    category: EventCategory.NATURAL_DISASTER,
    subType: EventSubType.STORM,
    titleGen: (c) => `Tempestade severa — ${c}`,
    riskBase: 40,
  },
  {
    category: EventCategory.HEALTH,
    subType: EventSubType.EPIDEMIC,
    titleGen: (c) => `Surto de doença — ${c}`,
    riskBase: 55,
  },
];

const EVENT_LOCATIONS: Record<string, GeoPoint[]> = {
  JP: [{ lat: 35.676, lng: 139.65 }, { lat: 34.693, lng: 135.502 }, { lat: 35.011, lng: 135.768 }],
  US: [{ lat: 34.052, lng: -118.243 }, { lat: 40.712, lng: -74.006 }, { lat: 41.878, lng: -87.629 }],
  IL: [{ lat: 32.085, lng: 34.781 }, { lat: 31.768, lng: 35.213 }, { lat: 32.794, lng: 34.989 }],
  BR: [{ lat: -23.550, lng: -46.633 }, { lat: -22.906, lng: -43.172 }, { lat: -15.793, lng: -47.882 }],
  RU: [{ lat: 55.755, lng: 37.617 }, { lat: 59.934, lng: 30.335 }, { lat: 56.838, lng: 60.605 }],
  CN: [{ lat: 39.904, lng: 116.407 }, { lat: 31.230, lng: 121.473 }, { lat: 22.543, lng: 114.057 }],
  ID: [{ lat: -6.208, lng: 106.845 }, { lat: -7.257, lng: 112.752 }, { lat: -3.319, lng: 114.589 }],
  TR: [{ lat: 41.008, lng: 28.978 }, { lat: 39.933, lng: 32.859 }, { lat: 37.066, lng: 37.383 }],
  UA: [{ lat: 50.450, lng: 30.523 }, { lat: 49.839, lng: 24.029 }, { lat: 46.975, lng: 31.994 }],
  IR: [{ lat: 35.689, lng: 51.389 }, { lat: 34.639, lng: 50.875 }, { lat: 32.653, lng: 51.666 }],
};

export class SimulationEngine {
  private config: SimulationConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickCount: number = 0;
  private eventHistory: GlobalEvent[] = [];

  constructor(config?: Partial<SimulationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(onEvents: (events: GlobalEvent[]) => void): void {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const events = this.generateEvents();
      this.eventHistory.push(...events);

      if (this.eventHistory.length > 500) {
        this.eventHistory = this.eventHistory.slice(-500);
      }

      onEvents(events);
      this.tickCount++;
    }, this.config.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getHistory(): GlobalEvent[] {
    return this.eventHistory;
  }

  getConfig(): SimulationConfig {
    return this.config;
  }

  generateSingle(source: CollectorSource): GlobalEvent[] {
    const events: GlobalEvent[] = [];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]!;
    const typeDef = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]!;
    const locations = EVENT_LOCATIONS[country.code] ?? [{ lat: country.lat, lng: country.lng }];
    const location = locations[Math.floor(Math.random() * locations.length)]!;

    const randomFactor = (Math.random() - 0.5) * 20;
    const riskScore = Math.min(Math.max(Math.round(typeDef.riskBase + randomFactor), 5), 98);

    const event: GlobalEvent = {
      id: `sim-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: typeDef.titleGen(country.name),
      description: `Evento simulado (fallback) — ${source} — ${country.name}`,
      category: typeDef.category,
      subType: typeDef.subType,
      location: { lat: location.lat + (Math.random() - 0.5) * 0.5, lng: location.lng + (Math.random() - 0.5) * 0.5 },
      locationName: `${country.name}`,
      countryCode: country.code,
      countryName: country.name,
      impact: {
        magnitude: typeDef.subType === EventSubType.EARTHQUAKE ? 4 + Math.random() * 4 : undefined,
        fatalities: Math.random() > 0.7 ? Math.floor(Math.random() * 50) : undefined,
        affectedArea: Math.floor(Math.random() * 500),
      },
      riskScore,
      riskLevel: Math.min(Math.ceil(riskScore / 20), 6) as RiskLevel,
      source: 'simulation',
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: EventStatus.CREATED,
      lifecycle: { created: new Date().toISOString(), updated: new Date().toISOString() },
    };

    events.push(event);
    return events;
  }

  private generateEvents(): GlobalEvent[] {
    const events: GlobalEvent[] = [];

    for (let i = 0; i < this.config.eventsPerTick; i++) {
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]!;
      const typeDef = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]!;
      const locations = EVENT_LOCATIONS[country.code] ?? [{ lat: country.lat, lng: country.lng }];
      const location = locations[Math.floor(Math.random() * locations.length)]!;

      const randomFactor = (Math.random() - 0.5) * 20;
      const riskScore = Math.min(Math.max(Math.round(typeDef.riskBase + randomFactor), 5), 98);

      const event: GlobalEvent = {
        id: `sim-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        title: typeDef.titleGen(country.name),
        description: `Evento simulado para demonstração — ${country.name}`,
        category: typeDef.category,
        subType: typeDef.subType,
        location: { lat: location.lat + (Math.random() - 0.5) * 0.5, lng: location.lng + (Math.random() - 0.5) * 0.5 },
        locationName: `${country.name}`,
        countryCode: country.code,
        countryName: country.name,
        impact: {
          magnitude: typeDef.subType === EventSubType.EARTHQUAKE ? 4 + Math.random() * 4 : undefined,
          fatalities: Math.random() > 0.7 ? Math.floor(Math.random() * 50) : undefined,
          affectedArea: Math.floor(Math.random() * 500),
        },
        riskScore,
        riskLevel: Math.min(Math.ceil(riskScore / 20), 6) as RiskLevel,
        source: 'simulation',
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: Math.random() > 0.2 ? EventStatus.CREATED : EventStatus.UPDATED,
        lifecycle: { created: new Date().toISOString(), updated: new Date().toISOString() },
      };

      events.push(event);
    }

    return events;
  }
}
