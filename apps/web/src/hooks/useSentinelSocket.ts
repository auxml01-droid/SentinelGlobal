'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GlobalEvent, GlobalRiskScore, WSMessage, WSEventType, AIAnalysis } from '@sentinel/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface UseSentinelSocketReturn {
  connected: boolean;
  events: GlobalEvent[];
  globalRisk: GlobalRiskScore | null;
  lastEvent: GlobalEvent | null;
  aiAnalyses: AIAnalysis[];
}

export function useSentinelSocket(): UseSentinelSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [globalRisk, setGlobalRisk] = useState<GlobalRiskScore | null>(null);
  const [lastEvent, setLastEvent] = useState<GlobalEvent | null>(null);
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([]);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      setConnected(false);
    });

    socket.on('new_event', (data: WSMessage) => {
      const event = data.payload as GlobalEvent;
      setLastEvent(event);
      setEvents((prev) => {
        const next = [event, ...prev];
        return next.slice(0, 200);
      });
    });

    socket.on('risk_update', (data: WSMessage) => {
      setGlobalRisk(data.payload as GlobalRiskScore);
    });

    socket.on('ai_analysis', (data: WSMessage) => {
      const analyses = data.payload as AIAnalysis[];
      if (Array.isArray(analyses)) {
        setAiAnalyses(analyses);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected, events, globalRisk, lastEvent, aiAnalyses };
}
