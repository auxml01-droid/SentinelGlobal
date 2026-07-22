import { CollectorManager } from '@sentinel/collectors';
import { RiskEngine } from '@sentinel/risk-engine';
import { AIAnalyzer, PredictionEngine } from '@sentinel/ai-engine';
import { NotificationCenter, NotificationDelivery } from '@sentinel/notification-engine';
import { RedisEventBus, EventBusChannel } from '@sentinel/event-bus';
import { GlobalEvent, RiskLevel, WSMessage, WSEventType } from '@sentinel/types';
import Redis from 'ioredis';

const BROADCAST_INTERVAL = 2000;
const AI_INTERVAL = 30000;
const HEALTH_INTERVAL = 5000;

export async function startEmbeddedWorker(): Promise<void> {
  const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
  const useSimulation = process.env.SIMULATION_MODE !== 'false';

  console.log('🚀 Embedded Worker — Real Time Intelligence');
  console.log(`📡 Modo: ${useSimulation ? 'SIMULAÇÃO' : 'PRODUÇÃO'}`);
  console.log('📡 Pipeline: Collectors → Event Bus → Risk → AI → Notifications');

  const eventBus = new RedisEventBus({ host: REDIS_HOST, port: REDIS_PORT, prefix: 'sentinel' });
  const broadcastPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
  const riskEngine = new RiskEngine();
  const aiAnalyzer = new AIAnalyzer(riskEngine);
  const predictionEngine = new PredictionEngine(riskEngine);
  const notificationCenter = new NotificationCenter({});

  setupDemoSubscriber(notificationCenter);

  let lastBroadcast = 0;
  let lastAiRun = 0;
  let lastHealthRun = 0;

  eventBus.subscribe<GlobalEvent>(EventBusChannel.EVENTS_NEW, async (event: GlobalEvent) => {
    riskEngine.ingestEvent(event);

    const predictions = predictionEngine.generatePredictions(event);
    if (predictions.length > 0) {
      event.predictions = predictions;
      await eventBus.publish(EventBusChannel.AI_PREDICTIONS, {
        eventId: event.id,
        predictions,
        riskScore: event.riskScore,
      });
    }

    if (event.riskLevel >= RiskLevel.ALTO_RISCO || event.riskScore >= 60) {
      const deliveries = await notificationCenter.processEvent(event);
      const sentCount = deliveries.filter((d: NotificationDelivery) => d.status === 'sent' || d.status === 'partial').length;
      if (sentCount > 0) {
        console.log(`🔔 ${sentCount} notificações enviadas para ${event.title}`);
      }
    }
  });

  eventBus.subscribe<GlobalEvent>(EventBusChannel.EVENTS_UPDATED, async (event: GlobalEvent) => {
    riskEngine.ingestEvent(event);
  });

  eventBus.subscribe<GlobalEvent>(EventBusChannel.EVENTS_RESOLVED, async (event: GlobalEvent) => {
    riskEngine.resolveEvent(event.id);
  });

  eventBus.subscribe(EventBusChannel.COLLECTOR_HEALTH, (health: any) => {
    const icon = health.status === 'online' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';
    console.log(`${icon} [${health.source}] ${health.status} | ${health.uptimePercent}% uptime | ${health.avgResponseTimeMs}ms`);
  });

  const collectorManager = new CollectorManager(
    async (events: GlobalEvent[]) => {
      for (const event of events) {
        await eventBus.publish(EventBusChannel.EVENTS_NEW, event);
      }
      if (events.length > 0) {
        console.log(`📦 ${events.length} eventos publicados no Event Bus`);
      }
    },
    (_source: string, _success: boolean, _error?: string) => {},
    {
      useSimulation,
      apiKeys: {
        usgs: process.env.USGS_API_KEY ?? '',
        nasa_firms: process.env.NASA_FIRMS_API_KEY ?? '',
        openweather: process.env.OPENWEATHER_API_KEY ?? '',
        acled: process.env.ACLED_API_KEY ?? '',
        newsapi: process.env.NEWSAPI_KEY ?? '',
      },
    },
  );

  collectorManager.start();

  setInterval(async () => {
    const now = Date.now();

    if (now - lastBroadcast >= BROADCAST_INTERVAL) {
      lastBroadcast = now;
      const result = riskEngine.calculate();

      const message: WSMessage = {
        type: WSEventType.RISK_SCORE_UPDATE,
        payload: result,
        timestamp: new Date().toISOString(),
      };
      await broadcastPub.publish('risk:updates', JSON.stringify(message));
    }

    if (now - lastAiRun >= AI_INTERVAL) {
      lastAiRun = now;
      try {
        const events = riskEngine.getEvents({ limit: 200 });
        if (events.length === 0) return;

        const analyses = await aiAnalyzer.runAnalysis(events);
        if (analyses.length > 0) {
          const message: WSMessage = {
            type: WSEventType.AI_ANALYSIS,
            payload: analyses,
            timestamp: new Date().toISOString(),
          };
          await broadcastPub.publish('ai:analyses', JSON.stringify(message));

          const clusters = predictionEngine.getClusterPredictions(events);
          if (clusters.length > 0) {
            await broadcastPub.publish('ai:analyses', JSON.stringify({
              type: 'clusters',
              clusters,
              timestamp: new Date().toISOString(),
            }));
          }
        }
      } catch (error) {
        console.error('❌ Erro na análise de IA:', error);
      }
    }

    if (now - lastHealthRun >= HEALTH_INTERVAL) {
      lastHealthRun = now;
      const ebHealth = await eventBus.health();
      const riskStats = riskEngine.getStats();
      const notifStats = notificationCenter.getStats();

      await broadcastPub.publish('system:status', JSON.stringify({
        eventBus: ebHealth,
        riskEngine: { eventCount: riskStats.total, active: riskStats.active },
        notifications: notifStats,
        timestamp: new Date().toISOString(),
      }));
    }
  }, 1000);

  const shutdown = async () => {
    console.log('\n🛑 Parando embedded worker...');
    collectorManager.stop();
    await eventBus.close();
    await broadcastPub.quit();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('✅ Embedded Worker iniciado');
}

function setupDemoSubscriber(center: NotificationCenter): void {
  center.addSubscriber({
    id: 'demo-admin',
    name: 'Administrador',
    contacts: { email: 'admin@sentinelglobal.io' },
    rules: ['default-critical', 'default-high', 'default-alert'],
    active: true,
    createdAt: new Date().toISOString(),
    notificationCount: 0,
  });
}
