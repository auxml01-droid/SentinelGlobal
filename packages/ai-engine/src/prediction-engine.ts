import { GlobalEvent, EventSubType, EventPrediction } from '@sentinel/types';
import { RiskEngine } from '@sentinel/risk-engine';

interface PredictionModel {
  name: string;
  timeframe: string;
  confidence: number;
}

const PREDICTION_MODELS: Record<string, PredictionModel[]> = {
  [EventSubType.EARTHQUAKE]: [
    { name: 'aftershock', timeframe: '72 horas', confidence: 78 },
    { name: 'tsunami', timeframe: '6 horas', confidence: 45 },
    { name: 'structural_collapse', timeframe: '24 horas', confidence: 82 },
  ],
  [EventSubType.HURRICANE]: [
    { name: 'path_change', timeframe: '12 horas', confidence: 65 },
    { name: 'flooding', timeframe: '24 horas', confidence: 80 },
    { name: 'landslide', timeframe: '48 horas', confidence: 55 },
  ],
  [EventSubType.WILDFIRE]: [
    { name: 'spread', timeframe: '12 horas', confidence: 75 },
    { name: 'air_quality_decline', timeframe: '24 horas', confidence: 85 },
  ],
  [EventSubType.VOLCANO]: [
    { name: 'eruption', timeframe: '7 dias', confidence: 60 },
    { name: 'ash_cloud', timeframe: '24 horas', confidence: 70 },
    { name: 'lava_flow', timeframe: '48 horas', confidence: 50 },
  ],
  [EventSubType.FLOOD]: [
    { name: 'water_level_rise', timeframe: '6 horas', confidence: 80 },
    { name: 'landslide', timeframe: '12 horas', confidence: 60 },
  ],
  [EventSubType.WAR]: [
    { name: 'escalation', timeframe: '7 dias', confidence: 55 },
    { name: 'civilian_displacement', timeframe: '72 horas', confidence: 70 },
  ],
  [EventSubType.MILITARY_ATTACK]: [
    { name: 'retaliation', timeframe: '48 horas', confidence: 50 },
    { name: 'civilian_casualties', timeframe: '24 horas', confidence: 65 },
  ],
  [EventSubType.CYBER_ATTACK]: [
    { name: 'infrastructure_disruption', timeframe: '24 horas', confidence: 70 },
    { name: 'data_breach', timeframe: '72 horas', confidence: 55 },
  ],
  [EventSubType.EPIDEMIC]: [
    { name: 'spread', timeframe: '7 dias', confidence: 75 },
    { name: 'healthcare_overload', timeframe: '14 dias', confidence: 65 },
  ],
  [EventSubType.NUCLEAR_LEAK]: [
    { name: 'contamination_spread', timeframe: '48 horas', confidence: 80 },
    { name: 'evacuation_need', timeframe: '6 horas', confidence: 90 },
  ],
};

export class PredictionEngine {
  private riskEngine?: RiskEngine;

  constructor(riskEngine?: RiskEngine) {
    this.riskEngine = riskEngine;
  }

  generatePredictions(event: GlobalEvent): EventPrediction[] {
    const models = PREDICTION_MODELS[event.subType] ?? [];
    const predictions: EventPrediction[] = [];

    for (const model of models) {
      let baseProbability = model.confidence;

      if (event.riskScore > 60) baseProbability *= 1.2;
      if (event.riskScore > 80) baseProbability *= 1.3;

      if (event.impact.magnitude && event.impact.magnitude > 6) {
        baseProbability *= 1.15;
      }

      if (event.impact.fatalities && event.impact.fatalities > 10) {
        baseProbability *= 1.1;
      }

      const probability = Math.min(Math.round(baseProbability), 95);

      const estimatedAffected = this.estimateAffected(event.subType, event.riskScore);

      predictions.push({
        type: model.name,
        probability,
        confidence: model.confidence,
        estimatedAffected,
        timeToEvent: model.timeframe,
      });
    }

    return predictions;
  }

  batchPredict(events: GlobalEvent[]): Map<string, EventPrediction[]> {
    const results = new Map<string, EventPrediction[]>();
    for (const event of events) {
      results.set(event.id, this.generatePredictions(event));
    }
    return results;
  }

  getClusterPredictions(events: GlobalEvent[]): {
    region: string;
    clusterType: string;
    count: number;
    avgProbability: number;
    predictions: EventPrediction[];
  }[] {
    const clusters = new Map<string, { events: GlobalEvent[]; type: string }>();

    for (const event of events) {
      if (!event.countryCode) continue;
      const key = `${event.countryCode}_${event.subType}`;
      if (!clusters.has(key)) {
        clusters.set(key, { events: [], type: event.subType });
      }
      clusters.get(key)!.events.push(event);
    }

    const results: {
      region: string;
      clusterType: string;
      count: number;
      avgProbability: number;
      predictions: EventPrediction[];
    }[] = [];

    for (const [key, cluster] of clusters) {
      if (cluster.events.length < 2) continue;

      const [countryCode] = key.split('_');
      const sampleEvent = cluster.events[0]!;
      const predictions = this.generatePredictions(sampleEvent);
      const avgProbability = predictions.length > 0
        ? Math.round(predictions.reduce((s, p) => s + p.probability, 0) / predictions.length)
        : 0;

      results.push({
        region: countryCode!,
        clusterType: cluster.type,
        count: cluster.events.length,
        avgProbability,
        predictions,
      });
    }

    return results;
  }

  private estimateAffected(subType: string, riskScore: number): number {
    const baseMap: Record<string, number> = {
      [EventSubType.EARTHQUAKE]: 50000,
      [EventSubType.HURRICANE]: 100000,
      [EventSubType.FLOOD]: 30000,
      [EventSubType.WILDFIRE]: 5000,
      [EventSubType.TSUNAMI]: 200000,
      [EventSubType.VOLCANO]: 20000,
      [EventSubType.WAR]: 500000,
      [EventSubType.EPIDEMIC]: 1000000,
      [EventSubType.PANDEMIC]: 5000000,
    };

    const base = baseMap[subType] ?? 10000;
    const factor = riskScore / 50;
    return Math.round(base * factor);
  }
}
