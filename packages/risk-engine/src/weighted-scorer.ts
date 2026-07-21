import { GlobalEvent, EventSubType, EventCategory, EventImpact } from '@sentinel/types';

export interface ScoreWeights {
  magnitude: number;
  population: number;
  infrastructure: number;
  history: number;
  aiConfidence: number;
}

export interface CountryWeights {
  infrastructureIndex: number;
  populationDensity: number;
  historicalRisk: number;
}

const COUNTRY_WEIGHTS: Record<string, CountryWeights> = {
  JP: { infrastructureIndex: 95, populationDensity: 85, historicalRisk: 90 },
  US: { infrastructureIndex: 90, populationDensity: 40, historicalRisk: 60 },
  CN: { infrastructureIndex: 80, populationDensity: 90, historicalRisk: 70 },
  IN: { infrastructureIndex: 55, populationDensity: 95, historicalRisk: 65 },
  RU: { infrastructureIndex: 65, populationDensity: 15, historicalRisk: 75 },
  BR: { infrastructureIndex: 50, populationDensity: 30, historicalRisk: 55 },
  ID: { infrastructureIndex: 40, populationDensity: 80, historicalRisk: 85 },
  PH: { infrastructureIndex: 35, populationDensity: 85, historicalRisk: 80 },
  MX: { infrastructureIndex: 45, populationDensity: 60, historicalRisk: 65 },
  TR: { infrastructureIndex: 50, populationDensity: 70, historicalRisk: 75 },
  IR: { infrastructureIndex: 40, populationDensity: 55, historicalRisk: 80 },
  CL: { infrastructureIndex: 60, populationDensity: 25, historicalRisk: 70 },
  IT: { infrastructureIndex: 85, populationDensity: 65, historicalRisk: 60 },
  GR: { infrastructureIndex: 70, populationDensity: 40, historicalRisk: 55 },
  NZ: { infrastructureIndex: 85, populationDensity: 10, historicalRisk: 45 },
};

const DEFAULT_WEIGHTS: CountryWeights = { infrastructureIndex: 50, populationDensity: 50, historicalRisk: 50 };

const CATEGORY_MODIFIERS: Record<EventCategory, number> = {
  [EventCategory.NATURAL_DISASTER]: 1.0,
  [EventCategory.CONFLICT]: 1.3,
  [EventCategory.TECH_RISK]: 1.2,
  [EventCategory.HEALTH]: 1.1,
  [EventCategory.TRANSPORT]: 0.8,
};

const SUBTYPE_SCORE_TABLE: Record<EventSubType, number> = {
  [EventSubType.EARTHQUAKE]: 60,
  [EventSubType.VOLCANO]: 55,
  [EventSubType.TSUNAMI]: 75,
  [EventSubType.HURRICANE]: 65,
  [EventSubType.TORNADO]: 50,
  [EventSubType.STORM]: 35,
  [EventSubType.LIGHTNING]: 15,
  [EventSubType.WILDFIRE]: 55,
  [EventSubType.DROUGHT]: 40,
  [EventSubType.FLOOD]: 50,
  [EventSubType.HEAT_WAVE]: 30,
  [EventSubType.BLIZZARD]: 25,
  [EventSubType.WAR]: 85,
  [EventSubType.MILITARY_ATTACK]: 70,
  [EventSubType.BOMBING]: 65,
  [EventSubType.MISSILE_LAUNCH]: 75,
  [EventSubType.TERRORISM]: 70,
  [EventSubType.CYBER_ATTACK]: 50,
  [EventSubType.MILITARY_MOVEMENT]: 40,
  [EventSubType.MILITARY_EXERCISE]: 25,
  [EventSubType.DIPLOMATIC_TENSION]: 30,
  [EventSubType.NUCLEAR_LEAK]: 90,
  [EventSubType.CHEMICAL_ACCIDENT]: 70,
  [EventSubType.DAM_BREACH]: 65,
  [EventSubType.BLACKOUT]: 40,
  [EventSubType.CRITICAL_INFRA_ATTACK]: 75,
  [EventSubType.EPIDEMIC]: 70,
  [EventSubType.PANDEMIC]: 90,
  [EventSubType.WHO_ALERT]: 55,
  [EventSubType.NEW_VIRUS]: 75,
  [EventSubType.AIR_CRASH]: 60,
  [EventSubType.MARITIME_COLLISION]: 45,
  [EventSubType.AIRPORT_CLOSURE]: 30,
  [EventSubType.PORT_CLOSURE]: 35,
};

export class WeightedScorer {
  private weights: ScoreWeights;

  constructor(weights?: Partial<ScoreWeights>) {
    this.weights = {
      magnitude: weights?.magnitude ?? 0.25,
      population: weights?.population ?? 0.20,
      infrastructure: weights?.infrastructure ?? 0.15,
      history: weights?.history ?? 0.20,
      aiConfidence: weights?.aiConfidence ?? 0.20,
    };
  }

  scoreEvent(event: GlobalEvent): { riskScore: number; riskLevel: number } {
    const countryWeights = COUNTRY_WEIGHTS[event.countryCode ?? ''] ?? DEFAULT_WEIGHTS;

    const magnitudeScore = this.calcMagnitudeScore(event.impact, event.subType);
    const populationScore = countryWeights.populationDensity;
    const infrastructureScore = countryWeights.infrastructureIndex;
    const historyScore = countryWeights.historicalRisk;
    const aiScore = event.predictions
      ? Math.max(...event.predictions.map((p) => p.confidence * 100))
      : 30;

    const categoryMod = CATEGORY_MODIFIERS[event.category] ?? 1.0;
    const subTypeBase = SUBTYPE_SCORE_TABLE[event.subType] ?? 30;

    let score =
      magnitudeScore * this.weights.magnitude +
      populationScore * this.weights.population +
      infrastructureScore * this.weights.infrastructure +
      historyScore * this.weights.history +
      aiScore * this.weights.aiConfidence;

    score = score * categoryMod;
    score = Math.max(score, subTypeBase * 0.5);
    const finalScore = Math.min(Math.round(score), 100);

    return {
      riskScore: finalScore,
      riskLevel: Math.min(Math.ceil(finalScore / 20), 6),
    };
  }

  private calcMagnitudeScore(impact: EventImpact, subType: EventSubType): number {
    if (impact.magnitude !== undefined) {
      if (subType === EventSubType.EARTHQUAKE) {
        return Math.min((impact.magnitude / 9.5) * 100, 95);
      }
      if (subType === EventSubType.HURRICANE || subType === EventSubType.STORM) {
        return Math.min((impact.magnitude / 5) * 100, 90);
      }
    }

    let score = 10;
    if (impact.fatalities && impact.fatalities > 0) {
      score += Math.min(impact.fatalities * 2, 40);
    }
    if (impact.injured && impact.injured > 0) {
      score += Math.min(impact.injured * 0.5, 20);
    }
    if (impact.displaced && impact.displaced > 0) {
      score += Math.min(impact.displaced * 0.3, 15);
    }
    if (impact.economicDamage && impact.economicDamage > 0) {
      score += Math.min(impact.economicDamage / 1e8, 15);
    }
    if (impact.affectedArea && impact.affectedArea > 0) {
      score += Math.min(impact.affectedArea / 10, 10);
    }

    return Math.min(score, 95);
  }
}
