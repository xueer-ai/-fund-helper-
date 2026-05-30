'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BuySignal, FullPositionCheck, Alert } from './types';

// ========== 基金实时数据 Hook ==========

interface FundRealtimeData {
  code: string;
  name: string;
  nav: number;
  lastNav: number;
  change: number;
  updateTime: string;
  isTrading: boolean;
  source: 'realtime' | 'fallback';
}

interface ScanResult {
  disclaimer: string;
  scanTime: string;
  navMap: Record<string, number>;
  signals: BuySignal[];
  triggeredSignals: BuySignal[];
  alerts: Alert[];
  fullPositionCheck: FullPositionCheck;
  summary: {
    triggeredBuyPoints: number;
    totalBuyPoints: number;
    alertCount: number;
    redAlerts: number;
    fullCheckMet: number;
  };
}

interface SchedulerStatus {
  isWorkday: boolean;
  isFriday: boolean;
  currentPeriod: string;
  cycle: {
    phase: string;
    phaseName: string;
    daysToNationalDay: number;
    daysToNovember: number;
  };
  nextActions: string[];
}

interface LearningData {
  period: string;
  periodName: string;
  title: string;
  content: string;
  keyPoints: string[];
  quizzes?: Array<{
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  knowledgeLink: string;
}

// 基金数据Hook（自动刷新）
export function useFundData(autoRefresh = true, intervalMs = 60000) {
  const [fundData, setFundData] = useState<FundRealtimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/fund-data?all=1');
      const data = await res.json();
      if (data.funds) {
        setFundData(data.funds);
        setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
      }
    } catch {
      // 静默失败，保留上次数据
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      timerRef.current = setInterval(fetchData, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, autoRefresh, intervalMs]);

  return { fundData, loading, lastUpdate, refresh: fetchData };
}

// 扫描结果Hook
export function useScanResult(autoRefresh = true, intervalMs = 120000) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scan = useCallback(async () => {
    try {
      const res = await fetch('/api/scan?type=all');
      const data = await res.json();
      setScanResult(data);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    scan();
    if (autoRefresh) {
      timerRef.current = setInterval(scan, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scan, autoRefresh, intervalMs]);

  return { scanResult, loading, rescan: scan };
}

// 调度器状态Hook
export function useScheduler(intervalMs = 60000) {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/scheduler?action=status');
        const data = await res.json();
        setStatus(data);
      } catch {
        // 静默失败
      }
    };
    fetchStatus();
    timerRef.current = setInterval(fetchStatus, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return status;
}

// 学习内容Hook
export function useLearning(action: string) {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLearning = async () => {
      try {
        const res = await fetch(`/api/scheduler?action=${action}`);
        const result = await res.json();
        setData(result);
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    };
    fetchLearning();
  }, [action]);

  return { data, loading };
}

// ========== 浏览器通知 Hook ==========

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
  }, []);

  const notify = useCallback((title: string, body: string, tag?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: tag || 'fund-monitor',
      requireInteraction: true,
    });
  }, []);

  return { permission, requestPermission, notify };
}

// ========== 微信推送 Hook ==========

export function useWechatPush() {
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('serverchan_sendkey');
    setPushEnabled(!!stored);
  }, []);

  const pushToWechat = useCallback(async (type: string, data?: Record<string, unknown>) => {
    const sendKey = localStorage.getItem('serverchan_sendkey');
    if (!sendKey) return false;

    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendKey, type, data }),
      });
      const result = await res.json();
      return result.success;
    } catch {
      return false;
    }
  }, []);

  // 检查自动推送配置
  const getAutoPushConfig = useCallback(() => {
    try {
      const stored = localStorage.getItem('serverchan_auto');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { buySignal: true, riskAlert: true, learning: false, yanxuan: false };
  }, []);

  return { pushEnabled, pushToWechat, getAutoPushConfig };
}

// ========== 工作日定时自动扫描 + 微信推送 Hook ==========

export function useAutoMonitor() {
  const { pushToWechat, getAutoPushConfig } = useWechatPush();
  const lastPushRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const checkAndPush = async () => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeKey = `${hours}_${minutes}`;

      // 仅工作日
      if (day < 1 || day > 5) return;
      // 防止同一分钟重复推送
      if (lastPushRef.current[timeKey] && Date.now() - lastPushRef.current[timeKey] < 60000) return;

      const autoConfig = getAutoPushConfig();

      // 14:30 尾盘买点扫描 + 推送
      if (hours === 14 && minutes === 30 && autoConfig.buySignal) {
        try {
          const res = await fetch('/api/scan?type=buy');
          const data = await res.json();
          const triggered = data.signals?.filter((s: BuySignal) => s.isTriggered) || [];
          if (triggered.length > 0) {
            await pushToWechat('buy_signal', { signals: triggered });
            lastPushRef.current[timeKey] = Date.now();
          }
        } catch { /* ignore */ }
      }

      // 14:30 风控预警推送
      if (hours === 14 && minutes === 30 && autoConfig.riskAlert) {
        try {
          const res = await fetch('/api/scan?type=alert');
          const data = await res.json();
          const urgent = data.alerts?.filter((a: Alert) => a.level === 'red' || a.level === 'yellow') || [];
          if (urgent.length > 0) {
            await pushToWechat('risk_alert', { alerts: urgent });
          }
        } catch { /* ignore */ }
      }

      // 09:20 早间学习推送
      if (hours === 9 && minutes === 20 && autoConfig.learning) {
        try {
          const res = await fetch('/api/scheduler?action=morning_learning');
          const data = await res.json();
          if (data.title) {
            await pushToWechat('learning', data);
            lastPushRef.current[timeKey] = Date.now();
          }
        } catch { /* ignore */ }
      }

      // 09:30 严选播报推送
      if (hours === 9 && minutes === 30 && autoConfig.yanxuan) {
        try {
          const res = await fetch('/api/scheduler?action=morning_yanxuan');
          const data = await res.json();
          if (data.cycleAnalysis) {
            await pushToWechat('yanxuan', data);
            lastPushRef.current[timeKey] = Date.now();
          }
        } catch { /* ignore */ }
      }
    };

    const timer = setInterval(checkAndPush, 30000); // 每30秒检查
    return () => clearInterval(timer);
  }, [pushToWechat, getAutoPushConfig]);
}
