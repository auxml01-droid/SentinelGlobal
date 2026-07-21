import { BaseCollector } from './base-collector';
import { USGSCollector } from './usgs-collector';
import { EMSCCollector } from './emsc-collector';
import { FIRMSCollector } from './nasa-firms-collector';
import { OpenWeatherCollector } from './openweather-collector';
import { NOAACollector } from './noaa-collector';
import { NHCCollector } from './nhc-collector';
import { SmithsonianCollector } from './smithsonian-collector';
import { ACLEDCollector } from './acled-collector';
import { GDELTCollector } from './gdelt-collector';
import { WHOCollector } from './who-collector';
import { NewsCollector } from './news-collector';
import { SimulationEngine } from './simulation-engine';
import { GlobalEvent, CollectorResult, CollectorSource } from '@sentinel/types';

export type EventHandler = (events: GlobalEvent[]) => void;
export type StatusHandler = (source: CollectorSource, success: boolean, error?: string) => void;

export class CollectorManager {
  private collectors: BaseCollector[] = [];
  private simulationEngine: SimulationEngine;
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private onEvents: EventHandler;
  private onStatus: StatusHandler;
  private useSimulation: boolean;

  constructor(
    onEvents: EventHandler,
    onStatus: StatusHandler,
    config?: { useSimulation?: boolean; apiKeys?: Record<string, string> },
  ) {
    this.onEvents = onEvents;
    this.onStatus = onStatus;
    this.useSimulation = config?.useSimulation ?? false;

    this.simulationEngine = new SimulationEngine();

    this.collectors = [
      new USGSCollector(config?.apiKeys?.usgs),
      new EMSCCollector(),
      new FIRMSCollector(config?.apiKeys?.nasa_firms),
      new OpenWeatherCollector(config?.apiKeys?.openweather),
      new NOAACollector(),
      new NHCCollector(),
      new SmithsonianCollector(),
      new ACLEDCollector(config?.apiKeys?.acled),
      new GDELTCollector(),
      new WHOCollector(),
      new NewsCollector(config?.apiKeys?.newsapi),
    ];
  }

  start(): void {
    for (const collector of this.collectors) {
      if (!collector.isEnabled()) continue;
      this.startCollector(collector);
    }

    if (this.useSimulation) {
      this.simulationEngine.start((events) => {
        this.onEvents(events);
      });
      console.log(`🎮 Modo simulação ativo — ${this.simulationEngine.getConfig().intervalMs}ms`);
    }

    console.log(`📡 CollectorManager iniciado: ${this.collectors.filter(c => c.isEnabled()).length} coletores`);
  }

  stop(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.simulationEngine.stop();
    console.log('🛑 CollectorManager parado');
  }

  private startCollector(collector: BaseCollector): void {
    const run = async () => {
      try {
        const result = await collector.fetch();
        this.handleResult(result, collector);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.onStatus(collector.getSource(), false, msg);
      }
    };

    run();
    const timer = setInterval(run, collector.getInterval());
    this.timers.set(collector.getName(), timer);
  }

  private handleResult(result: CollectorResult, collector: BaseCollector): void {
    this.onStatus(collector.getSource(), result.success, result.error);

    if (result.success && result.events.length > 0) {
      this.onEvents(result.events);
    }
  }

  getActiveCollectors(): { name: string; source: CollectorSource; interval: number }[] {
    return this.collectors
      .filter((c) => c.isEnabled())
      .map((c) => ({
        name: c.getName(),
        source: c.getSource(),
        interval: c.getInterval(),
      }));
  }
}
