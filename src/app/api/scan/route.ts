import { NextRequest, NextResponse } from 'next/server';
import { FUNDS, DISCLAIMER, CYCLE_THEORIES, IRON_RULES } from '@/lib/constants';
import type { BuySignal, FullPositionCheck, Alert } from '@/lib/types';

// ========== 买点扫描与信号检测 ==========

// 基金代码映射
const FUND_CODE_MAP: Record<string, string> = {
  '159140': '159140',
  '159142': '159142',
  '022364': '022364',
  '华夏芯片': '008887',
  '平安半导体': '016074',
  '宝盈转型': '000535',
  '博时新能源': '017055',
};

// 从fund-data API获取最新净值
async function getLatestNavs(): Promise<Record<string, number>> {
  try {
    const baseUrl = process.env.DEPLOY_RUN_PORT
      ? `http://localhost:${process.env.DEPLOY_RUN_PORT}`
      : 'http://localhost:5000';
    const res = await fetch(`${baseUrl}/api/fund-data?all=1`, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    const navMap: Record<string, number> = {};
    if (data.funds) {
      for (const f of data.funds) {
        navMap[f.code] = f.nav;
      }
    }
    return navMap;
  } catch {
    // 回退到基础数据
    return {
      '159140': 1.42,
      '159142': 1.38,
      '022364': 5.95,
      '华夏芯片': 1.85,
      '平安半导体': 0.89,
      '宝盈转型': 2.15,
      '博时新能源': 1.05,
      '科创50': 1050,
    };
  }
}

// 检测三档买点
function detectBuySignals(funds: typeof FUNDS, navMap: Record<string, number>): BuySignal[] {
  const signals: BuySignal[] = [];

  for (const fund of funds) {
    const nav = navMap[fund.code] || 0;
    if (!fund.buyPoints) continue;

    // 第一档：黄金坑
    if (fund.buyPoints.golden) {
      signals.push({
        fundCode: fund.code,
        tier: 1,
        tierName: '黄金坑第一买点',
        threshold: fund.buyPoints.golden,
        currentNav: nav,
        isTriggered: nav > 0 && nav <= fund.buyPoints.golden,
        positionRatio: fund.code === '022364' ? '5.85预埋2%→到位补满6%' : '12%（2-3天买入）',
        description: fund.code === '022364'
          ? `净值≤${fund.buyPoints.golden}，5.85预埋2%，到位补满6%尾盘操作`
          : `净值≤${fund.buyPoints.golden}，回调约20%，分2-3天买入总计划仓位12%`,
        knowledgeLink: '分批建仓铁律',
      });
    }

    // 第二档：钻石坑
    if (fund.buyPoints.diamond) {
      signals.push({
        fundCode: fund.code,
        tier: 2,
        tierName: '钻石坑第二买点',
        threshold: fund.buyPoints.diamond,
        currentNav: nav,
        isTriggered: nav > 0 && nav <= fund.buyPoints.diamond,
        positionRatio: fund.code === '022364' ? '6%' : '12%（一次性买入）',
        description: fund.code === '022364'
          ? `净值≤${fund.buyPoints.diamond}，同步买入6%，维持4:2仓位比例`
          : `净值≤${fund.buyPoints.diamond}，回调约25%，全年超跌机会，一次性买入12%总仓位`,
        knowledgeLink: '历史极端行情应对',
      });
    }

    // 替代标的黄金坑
    if (fund.buyPoints.golden && !fund.buyPoints.diamond) {
      // 159142只有黄金坑
    }
  }

  return signals;
}

// 检测风控预警
function detectAlerts(funds: typeof FUNDS, navMap: Record<string, number>): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();

  // 追高拦截
  const nav159140 = navMap['159140'] || 0;
  const nav022364 = navMap['022364'] || 0;

  if (nav159140 > 1.37) {
    alerts.push({
      id: `chase_${Date.now()}_159140`,
      level: 'yellow',
      title: '159140追高拦截',
      message: `当前净值${nav159140.toFixed(4)}，已超过黄金坑阈值1.37，劝阻一切新开仓`,
      fundCode: '159140',
      timestamp: now,
      action: '暂停买入，等待回调至1.37以下',
      knowledgeLink: '追高是亏损根源',
    });
  }

  if (nav022364 > 5.68) {
    alerts.push({
      id: `chase_${Date.now()}_022364`,
      level: 'yellow',
      title: '022364追高拦截',
      message: `当前净值${nav022364.toFixed(4)}，已超过黄金坑阈值5.68，劝阻一切新开仓（含自有基金腾挪资金）`,
      fundCode: '022364',
      timestamp: now,
      action: '暂停买入，等待回调至5.68以下',
      knowledgeLink: '追高是亏损根源',
    });
  }

  // 用户持仓预警
  for (const fund of funds) {
    if (!fund.isUserHolding || !fund.holding) continue;

    // 平安半导体浮亏预警
    if (fund.code === '平安半导体') {
      const profitRate = fund.holding.profitRate;
      if (profitRate <= -20) {
        alerts.push({
          id: `stoploss_${Date.now()}_pingan`,
          level: 'red',
          title: '平安半导体浮亏达20%强制止损',
          message: `当前浮亏${profitRate}%，已达20%止损线，必须暂停加仓`,
          fundCode: fund.code,
          timestamp: now,
          action: '立刻暂停加仓 → 科创50破1200减仓50% → 考虑置换资金至159140/022364',
          knowledgeLink: '价格止损铁律',
        });
      } else if (profitRate <= -15) {
        alerts.push({
          id: `warn_${Date.now()}_pingan`,
          level: 'yellow',
          title: '平安半导体浮亏逼近20%警戒线',
          message: `当前浮亏${profitRate}%，距离20%止损线仅剩${Math.abs(profitRate + 20).toFixed(1)}%空间`,
          fundCode: fund.code,
          timestamp: now,
          action: '暂停加仓，密切关注，科创50破1200减仓50%',
          knowledgeLink: '价格止损铁律',
        });
      }
    }

    // 华夏芯片止盈提醒
    if (fund.code === '华夏芯片' && fund.holding.profitRate > 45) {
      alerts.push({
        id: `profit_${Date.now()}_huaxia`,
        level: 'normal',
        title: '华夏芯片高浮盈止盈提醒',
        message: `当前浮盈${fund.holding.profitRate}%，每次拉升5%-8%触发分批减仓，锁定40%-60%基准收益`,
        fundCode: fund.code,
        timestamp: now,
        action: '拉升5%-8%减仓1/3 → 再拉升减1/3 → 保留小底仓博弈国庆窗口',
        knowledgeLink: '财富变现与流动性管理',
      });
    }

    // 宝盈备用金铁律
    if (fund.code === '宝盈转型') {
      alerts.push({
        id: `iron_${Date.now()}_baoying`,
        level: 'normal',
        title: '宝盈备用金不加仓铁律',
        message: '半年内禁止追加资金，仅做应急备用金',
        fundCode: fund.code,
        timestamp: now,
        action: '不操作 → 极端风险时优先赎回',
        knowledgeLink: '现金财富守恒定律',
      });
    }
  }

  // 半年周期时间预警
  const novDeadline = new Date('2026-11-30');
  const daysToNov = Math.ceil((novDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToNov < 60 && daysToNov > 0) {
    alerts.push({
      id: `time_${Date.now()}`,
      level: daysToNov < 30 ? 'red' : 'yellow',
      title: `11月时间止损节点仅剩${daysToNov}天`,
      message: `距离2026年11月时间止损节点仅剩${daysToNov}天，未创新高则AI仓位压至20%以下`,
      timestamp: now,
      action: '评估持仓收益 → 准备减仓计划 → 11月前执行止损',
      knowledgeLink: '时间止损铁律',
    });
  }

  // AI仓位上限检查
  const chipWeight = 35; // 华夏芯片估算
  const pingAnWeight = 10; // 平安半导体估算
  const aiTotal = chipWeight + pingAnWeight;
  if (aiTotal > 55) {
    alerts.push({
      id: `position_${Date.now()}`,
      level: 'normal',
      title: 'AI仓位逼近60%上限',
      message: `当前AI仓位占比约${aiTotal}%，距60%上限仅${60 - aiTotal}%空间`,
      timestamp: now,
      action: '暂不加仓AI赛道基金，优先利用现有仓位',
      knowledgeLink: '仓位管理原则',
    });
  }

  return alerts;
}

// 满仓条件检测
function checkFullPosition(navMap: Record<string, number>): FullPositionCheck {
  const star50 = navMap['科创50'] || 1050;
  // 这些需要真实行情数据，目前使用合理默认值
  const check: FullPositionCheck = {
    consecutive3Up: false,  // 需K线数据
    volume15x: false,       // 需成交量数据
    maTurnUp: false,        // 需均线数据
    star50Above1200: star50 >= 1200,
    metCount: 0,
    isReady: false,
  };
  check.metCount = [check.consecutive3Up, check.volume15x, check.maTurnUp, check.star50Above1200].filter(Boolean).length;
  check.isReady = check.metCount >= 2;
  return check;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';

  const navMap = await getLatestNavs();

  if (type === 'buy') {
    const signals = detectBuySignals(FUNDS, navMap);
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      scanTime: new Date().toISOString(),
      signals,
      triggered: signals.filter((s) => s.isTriggered),
    });
  }

  if (type === 'alert') {
    const alerts = detectAlerts(FUNDS, navMap);
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      scanTime: new Date().toISOString(),
      alerts,
      redCount: alerts.filter((a) => a.level === 'red').length,
      yellowCount: alerts.filter((a) => a.level === 'yellow').length,
      normalCount: alerts.filter((a) => a.level === 'normal').length,
    });
  }

  if (type === 'fullcheck') {
    const check = checkFullPosition(navMap);
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      scanTime: new Date().toISOString(),
      fullPositionCheck: check,
      star50: navMap['科创50'] || 0,
    });
  }

  // 全量扫描
  const signals = detectBuySignals(FUNDS, navMap);
  const alerts = detectAlerts(FUNDS, navMap);
  const fullCheck = checkFullPosition(navMap);

  return NextResponse.json({
    disclaimer: DISCLAIMER,
    scanTime: new Date().toISOString(),
    navMap,
    signals,
    triggeredSignals: signals.filter((s) => s.isTriggered),
    alerts,
    fullPositionCheck: fullCheck,
    summary: {
      triggeredBuyPoints: signals.filter((s) => s.isTriggered).length,
      totalBuyPoints: signals.length,
      alertCount: alerts.length,
      redAlerts: alerts.filter((a) => a.level === 'red').length,
      fullCheckMet: fullCheck.metCount,
    },
  });
}
