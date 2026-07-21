import { EventCategory, EventSubType, EventImpact } from '@sentinel/types';

const EVENT_WEIGHTS: Record<EventCategory, number> = {
  [EventCategory.NATURAL_DISASTER]: 30,
  [EventCategory.CONFLICT]: 50,
  [EventCategory.TECH_RISK]: 45,
  [EventCategory.HEALTH]: 40,
  [EventCategory.TRANSPORT]: 20,
};

const SUBTYPE_MULTIPLIERS: Partial<Record<EventSubType, number>> = {
  [EventSubType.WAR]: 2.0,
  [EventSubType.NUCLEAR_LEAK]: 1.8,
  [EventSubType.PANDEMIC]: 1.6,
  [EventSubType.TSUNAMI]: 1.5,
  [EventSubType.EARTHQUAKE]: 1.2,
  [EventSubType.HURRICANE]: 1.1,
  [EventSubType.CYBER_ATTACK]: 0.8,
  [EventSubType.FLOOD]: 0.7,
  [EventSubType.STORM]: 0.5,
};

export function calculateEventScore(
  category: EventCategory,
  subType: EventSubType,
  impact: EventImpact,
): number {
  const baseWeight = EVENT_WEIGHTS[category] ?? 25;
  const multiplier = SUBTYPE_MULTIPLIERS[subType] ?? 0.7;

  let magnitudeScore = 0;
  if (impact.magnitude) {
    magnitudeScore = Math.min(impact.magnitude * 12, 100);
  }

  let fatalityScore = 0;
  if (impact.fatalities) {
    fatalityScore = Math.min(Math.log2(impact.fatalities + 1) * 12, 100);
  }

  let areaScore = 0;
  if (impact.affectedArea) {
    areaScore = Math.min(Math.log2(impact.affectedArea + 1) * 10, 100);
  }

  let economicScore = 0;
  if (impact.economicDamage) {
    economicScore = Math.min(Math.log2(impact.economicDamage + 1) * 6, 100);
  }

  const score =
    baseWeight * 0.2 +
    magnitudeScore * 0.25 +
    fatalityScore * 0.3 +
    areaScore * 0.15 +
    economicScore * 0.1;

  return Math.min(Math.round(score * multiplier), 100);
}

export function scoreToLevel(score: number): number {
  if (score <= 20) return 1;
  if (score <= 40) return 2;
  if (score <= 60) return 3;
  if (score <= 80) return 4;
  if (score <= 95) return 5;
  return 6;
}

export function calculateCountryScore(eventScores: number[]): number {
  if (eventScores.length === 0) return 0;

  const sorted = [...eventScores].sort((a, b) => b - a);
  const topEvents = sorted.slice(0, 5);

  return Math.round(
    topEvents.reduce((sum, score, i) => {
      const weight = 1 - i * 0.15;
      return sum + score * Math.max(weight, 0.4);
    }, 0) / Math.max(topEvents.length, 1),
  );
}
