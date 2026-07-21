import { RiskLevel, EventImpact, EventCategory, EventSubType } from '@sentinel/types';

const MAGNITUDE_WEIGHT = 0.3;
const FATALITIES_WEIGHT = 0.25;
const AFFECTED_AREA_WEIGHT = 0.15;
const ECONOMIC_DAMAGE_WEIGHT = 0.1;
const CATEGORY_WEIGHT = 0.2;

const CATEGORY_BASE_SCORE: Record<EventCategory, number> = {
  [EventCategory.NATURAL_DISASTER]: 40,
  [EventCategory.CONFLICT]: 60,
  [EventCategory.TECH_RISK]: 55,
  [EventCategory.HEALTH]: 50,
  [EventCategory.TRANSPORT]: 30,
};

const SUBTYPE_MODIFIER: Partial<Record<EventSubType, number>> = {
  [EventSubType.EARTHQUAKE]: 1.0,
  [EventSubType.VOLCANO]: 0.8,
  [EventSubType.TSUNAMI]: 1.2,
  [EventSubType.HURRICANE]: 0.9,
  [EventSubType.TORNADO]: 0.6,
  [EventSubType.WAR]: 1.5,
  [EventSubType.NUCLEAR_LEAK]: 1.4,
  [EventSubType.PANDEMIC]: 1.3,
  [EventSubType.CYBER_ATTACK]: 0.7,
};

export function calculateEventRiskScore(
  category: EventCategory,
  subType: EventSubType,
  impact: EventImpact,
): number {
  const baseScore = CATEGORY_BASE_SCORE[category] ?? 40;
  const modifier = SUBTYPE_MODIFIER[subType] ?? 0.7;

  let magnitudeScore = 0;
  if (impact.magnitude) {
    magnitudeScore = Math.min(impact.magnitude * 10, 100);
  }

  let fatalitiesScore = 0;
  if (impact.fatalities) {
    fatalitiesScore = Math.min(Math.log2(impact.fatalities + 1) * 10, 100);
  }

  let areaScore = 0;
  if (impact.affectedArea) {
    areaScore = Math.min(Math.log2(impact.affectedArea + 1) * 8, 100);
  }

  let economicScore = 0;
  if (impact.economicDamage) {
    economicScore = Math.min(Math.log2(impact.economicDamage + 1) * 5, 100);
  }

  const score =
    baseScore * CATEGORY_WEIGHT +
    magnitudeScore * MAGNITUDE_WEIGHT +
    fatalitiesScore * FATALITIES_WEIGHT +
    areaScore * AFFECTED_AREA_WEIGHT +
    economicScore * ECONOMIC_DAMAGE_WEIGHT;

  return Math.min(Math.round(score * modifier), 100);
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 20) return RiskLevel.NORMAL;
  if (score <= 40) return RiskLevel.ATENCAO;
  if (score <= 60) return RiskLevel.ALERTA;
  if (score <= 80) return RiskLevel.ALTO_RISCO;
  if (score <= 95) return RiskLevel.CRITICO;
  return RiskLevel.EMERGENCIA_MUNDIAL;
}

export function calculateGlobalRiskScore(scores: number[]): number {
  if (scores.length === 0) return 0;

  const sorted = [...scores].sort((a, b) => b - a);
  const top10 = sorted.slice(0, 10);

  const weightedSum = top10.reduce((acc, score, index) => {
    const weight = 1 - index * 0.05;
    return acc + score * Math.max(weight, 0.5);
  }, 0);

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const topAvg = weightedSum / top10.length;

  return Math.round(Math.min(avgScore * 0.4 + topAvg * 0.6, 100));
}
