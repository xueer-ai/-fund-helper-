import { NextRequest, NextResponse } from 'next/server';
import { DISCLAIMER, IS_BACKTEST_MODE } from '@/lib/constants';

// ========== 后端定时扫描接口（供外部cron服务调用）==========
// 部署后通过 cron-job.org 等免费服务每30分钟调用一次
// 实现关掉电脑也能自动监控+微信推送

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  // 简单鉴权：防止外部滥用
  const cronToken = process.env.CRON_TOKEN || 'yuange2026';
  if (token !== cronToken) {
    return NextResponse.json({ error: '鉴权失败' }, { status: 401 });
  }

  if (IS_BACKTEST_MODE) {
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      mode: 'backtest',
      message: '回测模式已开启，跳过所有推送',
    });
  }

  // 判断当前是否为工作日
  const now = new Date();
  const overridePeriod = searchParams.get('period'); // 手动指定时段，用于测试
  // Helper: build push payload from env vars
  function buildPushPayload(extra: Record<string, unknown>): Record<string, unknown> | null {
    const sendKey = process.env.SEND_KEY;
    const pushplusToken = process.env.PUSHPLUS_TOKEN;
    if (!sendKey && !pushplusToken) return null;
    const payload: Record<string, unknown> = { ...extra };
    if (sendKey) payload.sendKey = sendKey;
    if (pushplusToken) {
      payload.pushplusToken = pushplusToken;
      payload.pushChannel = 'pushplus';
    }
    return payload;
  }

  const dayOfWeek = now.getDay();
  const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeSlot = hour * 60 + minute; // 当天分钟数

  if (!isWorkday) {
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      isWorkday: false,
      message: '周末休市，跳过扫描',
    });
  }

  const results: {
    time: string;
    period: string;
    scanResult?: Record<string, unknown>;
    pushResults: Array<{ type: string; fundCode?: string; success: boolean; message: string }>;
  } = {
    time: now.toISOString(),
    period: '',
    pushResults: [],
  };

  const baseUrl = process.env.DEPLOY_RUN_PORT
    ? `http://localhost:${process.env.DEPLOY_RUN_PORT}`
    : 'http://localhost:5000';

  // ========== 根据时段执行不同任务 ==========
  const period = overridePeriod || '';

  // 09:00-09:20 开盘前数据校准（最优先！确保数据与大盘一致）
  if (period === 'morning_calibration' || (timeSlot >= 540 && timeSlot <= 560)) {
    results.period = 'morning_calibration';
    try {
      // 强制实时拉取全部基金数据（calibrate=1）
      const dataRes = await fetch(`${baseUrl}/api/fund-data?all=1&calibrate=1`, {
        signal: AbortSignal.timeout(30000),
      });
      const dataData = await dataRes.json();
      const quality = dataData.dataQuality || {};
      results.scanResult = {
        totalFunds: quality.total || 0,
        realtimeCount: quality.realtime || 0,
        fallbackCount: quality.fallback || 0,
        isStale: quality.isStale || false,
        updateTime: dataData.updateTime || '',
      };

      // 如果数据过时，推送校准异常通知
      if (quality.isStale) {
        const alertPayload = buildPushPayload({
          type: 'daily_summary',
          data: {
            date: now.toLocaleDateString('zh-CN'),
            signals: 0,
            alerts: 1,
          },
        });
        if (alertPayload) {
          try {
            await fetch(`${baseUrl}/api/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(alertPayload),
              signal: AbortSignal.timeout(10000),
            });
            results.pushResults.push({ type: 'calibration_alert', success: true, message: '数据校准异常已推送' });
          } catch {
            results.pushResults.push({ type: 'calibration_alert', success: false, message: '校准异常推送失败' });
          }
        }
      }
    } catch {
      results.scanResult = { error: '开盘前数据校准失败' };
    }
  }

  // 09:20 早间学习（09:15-09:25）
  else if (period === 'morning_learning' || timeSlot >= 555 && timeSlot <= 565) {
    results.period = 'morning_learning';
    try {
      const res = await fetch(`${baseUrl}/api/scheduler?action=morning_learning`, {
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      results.scanResult = data;

      // 推送学习内容（如果用户开启了学习推送）
      const pushPayload = buildPushPayload({
        type: 'learning',
        data: {
          period: 'morning',
          title: data.title || '早间学习',
          content: (data.content || '').substring(0, 200),
        },
      });
      if (pushPayload) {
        try {
          const pushRes = await fetch(`${baseUrl}/api/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pushPayload),
            signal: AbortSignal.timeout(10000),
          });
          const pushData = await pushRes.json();
          results.pushResults.push({
            type: 'learning',
            success: pushData.success || false,
            message: pushData.error || '推送完成',
          });
        } catch {
          results.pushResults.push({ type: 'learning', success: false, message: '推送请求失败' });
        }
      }
    } catch {
      results.scanResult = { error: '早间学习获取失败' };
    }
  }

  // 09:30 早间严选播报（09:25-09:35）
  else if (period === 'morning_yanxuan' || timeSlot >= 565 && timeSlot <= 575) {
    results.period = 'morning_yanxuan';
    try {
      const res = await fetch(`${baseUrl}/api/scheduler?action=morning_yanxuan`, {
        signal: AbortSignal.timeout(15000),
      });
      results.scanResult = await res.json();
    } catch {
      results.scanResult = { error: '早间严选获取失败' };
    }
  }

  // 12:00 午间铁律复习（11:55-12:05）
  else if (period === 'noon_review' || timeSlot >= 715 && timeSlot <= 725) {
    results.period = 'noon_review';
    try {
      const res = await fetch(`${baseUrl}/api/scheduler?action=noon_review`, {
        signal: AbortSignal.timeout(15000),
      });
      results.scanResult = await res.json();
    } catch {
      results.scanResult = { error: '午间复习获取失败' };
    }
  }

  // 14:30 尾盘扫描（14:25-14:40）—— 最关键的时段！
  else if (period === 'afternoon_scan' || timeSlot >= 865 && timeSlot <= 880) {
    results.period = 'afternoon_scan';
    try {
      // 全量扫描：净值+买点+风控
      const scanRes = await fetch(`${baseUrl}/api/scan?type=all&autopush=1`, {
        signal: AbortSignal.timeout(20000),
      });
      const scanData = await scanRes.json();
      results.scanResult = {
        signals: scanData.signals?.filter((s: { isTriggered: boolean }) => s.isTriggered).length || 0,
        alerts: scanData.riskAlerts?.length || 0,
      };

      // 推送触发的买点信号
      const triggeredSignals: Array<{ fundCode: string; tierName: string; threshold: number; currentNav: number }> = scanData.signals?.filter(
        (s: { isTriggered: boolean }) => s.isTriggered
      ) || [];

      for (const signal of triggeredSignals) {
        const pushPayload = buildPushPayload({
          type: 'buy_signal',
          data: {
            fundName: signal.fundCode,
            tierName: signal.tierName,
            threshold: signal.threshold,
            currentNav: signal.currentNav,
          },
        });
        if (pushPayload) {
          try {
            const pushRes = await fetch(`${baseUrl}/api/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pushPayload),
              signal: AbortSignal.timeout(10000),
            });
            const pushData = await pushRes.json();
            results.pushResults.push({
              type: 'buy_signal',
              fundCode: signal.fundCode,
              success: pushData.success || false,
              message: pushData.error || '推送完成',
            });
          } catch {
            results.pushResults.push({
              type: 'buy_signal',
              fundCode: signal.fundCode,
              success: false,
              message: '推送请求失败',
            });
          }
        }

        // 推送红色风控预警
        const redAlerts: Array<{ title: string; message: string; fundCode: string }> = scanData.riskAlerts?.filter(
          (a: { level: string }) => a.level === 'red'
        ) || [];

        for (const alert of redAlerts) {
          const alertPayload = buildPushPayload({
            type: 'stop_loss',
            data: {
              fundName: alert.fundCode || alert.title,
              description: alert.message,
            },
          });
          if (alertPayload) {
            try {
              const pushRes = await fetch(`${baseUrl}/api/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertPayload),
                signal: AbortSignal.timeout(10000),
              });
              const pushData = await pushRes.json();
              results.pushResults.push({
                type: 'stop_loss',
                fundCode: alert.fundCode,
                success: pushData.success || false,
                message: pushData.error || '推送完成',
              });
            } catch {
              results.pushResults.push({
                type: 'stop_loss',
                fundCode: alert.fundCode,
                success: false,
                message: '推送请求失败',
              });
            }
          }
        } // end for redAlerts
      } // end for triggeredSignals
    } catch {
      results.scanResult = { error: '尾盘扫描失败' };
    }
  } else if (period === 'close_archive' || (timeSlot >= 900 && timeSlot <= 915)) {
    results.period = 'close_summary';
    try {
      const scanRes = await fetch(`${baseUrl}/api/scan?type=all`, {
        signal: AbortSignal.timeout(20000),
      });
      const scanData = await scanRes.json();
      results.scanResult = {
        totalFunds: Object.keys(scanData.navMap || {}).length,
        signals: scanData.signals?.length || 0,
        alerts: scanData.riskAlerts?.length || 0,
      };

      // 推送收盘日报
      const dailyPayload = buildPushPayload({
        type: 'daily_summary',
        data: {
          date: now.toLocaleDateString('zh-CN'),
          signals: scanData.signals?.filter((s: { isTriggered: boolean }) => s.isTriggered).length || 0,
          alerts: scanData.riskAlerts?.length || 0,
        },
      });
      if (dailyPayload) {
        try {
          const pushRes = await fetch(`${baseUrl}/api/push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dailyPayload),
            signal: AbortSignal.timeout(10000),
          });
          const pushData = await pushRes.json();
          results.pushResults.push({
            type: 'daily_summary',
            success: pushData.success || false,
            message: pushData.error || '推送完成',
          });
        } catch {
          results.pushResults.push({ type: 'daily_summary', success: false, message: '推送请求失败' });
        }
      }
    } catch {
      results.scanResult = { error: '收盘归档失败' };
    }
  }

  // 15:15 收盘学习（15:10-15:25）
  else if (timeSlot >= 910 && timeSlot <= 925) {
    results.period = 'close_learning';
    try {
      const res = await fetch(`${baseUrl}/api/scheduler?action=close_learning`, {
        signal: AbortSignal.timeout(15000),
      });
      results.scanResult = await res.json();
    } catch {
      results.scanResult = { error: '收盘学习获取失败' };
    }
  }

  // 其他时段：仅做基础净值扫描（每30分钟一次轻量检查）
  else {
    results.period = 'routine_check';
    try {
      const res = await fetch(`${baseUrl}/api/scan?type=buy`, {
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      const triggeredCount = data.signals?.filter((s: { isTriggered: boolean }) => s.isTriggered).length || 0;
      results.scanResult = { triggeredSignals: triggeredCount };

      // 只有触发信号才推送（静默期规则：不触发不推）
      if (triggeredCount > 0) {
        try {
          for (const signal of data.signals.filter((s: { isTriggered: boolean }) => s.isTriggered)) {
            const sigPayload = buildPushPayload({
              type: 'buy_signal',
              data: {
                fundName: signal.fundCode,
                tierName: signal.tierName,
                threshold: signal.threshold,
                currentNav: signal.currentNav,
              },
            });
            if (sigPayload) {
              try {
                const pushRes = await fetch(`${baseUrl}/api/push`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sigPayload),
                  signal: AbortSignal.timeout(10000),
                });
                const pushData = await pushRes.json();
                results.pushResults.push({
                  type: 'buy_signal',
                  fundCode: signal.fundCode,
                  success: pushData.success || false,
                  message: pushData.error || '推送完成',
                });
              } catch {
                results.pushResults.push({
                  type: 'buy_signal',
                  fundCode: signal.fundCode,
                  success: false,
                  message: '推送请求失败',
                });
              }
            } // end if sigPayload
          } // end for signals
        } catch {
          results.pushResults.push({ type: 'buy_signal', success: false, message: '信号推送异常' });
        }
      } // end if triggeredCount
    } catch {
      results.scanResult = { error: '基础扫描失败' };
    }
  } // end else routine_check

  return NextResponse.json({
    disclaimer: DISCLAIMER,
    ...results,
  });
}
