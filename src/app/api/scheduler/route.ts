import { NextRequest, NextResponse } from 'next/server';
import { DISCLAIMER, CYCLE_THEORIES, IRON_RULES, HISTORY_CASES, FUNDS } from '@/lib/constants';

// ========== 定时调度器 - 工作日自动监测 ==========

// 判断当前是否为工作日
function isWorkday(): boolean {
  const day = new Date().getDay();
  return day !== 0 && day !== 6;
}

// 判断是否为周五
function isFriday(): boolean {
  return new Date().getDay() === 5;
}

// 获取当前交易时段
function getCurrentPeriod(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeValue = hours * 100 + minutes;

  if (timeValue < 920) return 'pre_market';
  if (timeValue >= 920 && timeValue < 930) return 'morning_learning';  // 早间学习
  if (timeValue >= 930 && timeValue < 1200) return 'morning_report';   // 早间播报
  if (timeValue >= 1200 && timeValue < 1430) return 'noon_review';     // 午间复习
  if (timeValue >= 1430 && timeValue < 1505) return 'afternoon_scan';  // 尾盘扫描
  if (timeValue >= 1505 && timeValue < 1515) return 'close_archive';   // 收盘归档
  if (timeValue >= 1515 && timeValue < 1530) return 'close_learning';  // 收盘学习
  if (isFriday() && timeValue >= 1530 && timeValue < 1600) return 'weekly_review'; // 周度复盘
  if (isFriday() && timeValue >= 1600) return 'weekly_exam';           // 周度考核
  if (timeValue >= 1530) return 'after_hours';
  return 'unknown';
}

// 获取半年周期阶段
function getCyclePhase(): { phase: string; phaseName: string; daysToNationalDay: number; daysToNovember: number } {
  const now = new Date();
  const start = new Date('2026-05-29');
  const nationalDay = new Date('2026-10-01');
  const november = new Date('2026-11-30');

  const daysToNationalDay = Math.ceil((nationalDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysToNovember = Math.ceil((november.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let phase = 'layout';
  let phaseName = '布局期';
  if (now >= november) {
    phase = 'final';
    phaseName = '止损收尾期';
  } else if (now >= nationalDay) {
    phase = 'stop';
    phaseName = '止损期';
  } else if (now >= new Date('2026-09-15')) {
    phase = 'profit';
    phaseName = '止盈窗口期';
  }

  return { phase, phaseName, daysToNationalDay, daysToNovember };
}

// 早间学习内容（09:20）
function getMorningLearning() {
  const dayOfWeek = new Date().getDay(); // 0=周日, 6=周六
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=周一
  const theories = CYCLE_THEORIES || [];
  const focusTheory = theories[dayIndex % theories.length] || theories[0];

  return {
    period: 'morning',
    periodName: '早间学习',
    title: `源哥周期理论学习：${focusTheory.name}`,
    content: `${focusTheory.description}\n\n当前阶段：${focusTheory.currentPhase}\n对AI赛道影响：${focusTheory.impactOnAI}`,
    keyPoints: [
      `${focusTheory.name}核心定义与轮动规律`,
      `当前周期阶段判断方法`,
      `对159140/022364净值走势的影响权重`,
    ],
    quizzes: [
      {
        id: 'mq1',
        question: `${focusTheory.name}当前处于哪个阶段？`,
        options: [focusTheory.currentPhase, '主升浪启动期', '底部震荡期', '上升通道期'],
        correctIndex: 0,
        explanation: `根据源哥周期理论，${focusTheory.name}当前处于${focusTheory.currentPhase}阶段。${focusTheory.impactOnAI}`,
      },
      {
        id: 'mq2',
        question: '159140黄金坑第一买点触发条件是？',
        options: ['净值≤1.37（回调20%）', '净值≤1.28（回调25%）', '净值≤1.42', '连3阳线'],
        correctIndex: 0,
        explanation: '第一档黄金坑：159140净值≤1.37（5.12高点回调20%），分2-3天买入总计划仓位12%。这是源哥分批建仓铁律的核心应用。',
      },
      {
        id: 'mq3',
        question: '三大周期中，哪个直接影响AI赛道估值中枢？',
        options: ['美联储加息周期', '大宗商品油价周期', 'AI科技主线周期', '以上都是'],
        correctIndex: 3,
        explanation: '三大周期相互联动：AI主线周期决定产业趋势，加息周期压制估值，油价周期影响通胀和货币政策，三者共同作用AI赛道走势。',
      },
    ],
    knowledgeLink: '源哥三大周期理论',
  };
}

// 午间复习内容（12:00）
function getNoonReview() {
  const dayOfWeek = new Date().getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const rules = IRON_RULES || [];
  const rule = rules[dayIndex % rules.length] || rules[0];

  return {
    period: 'noon',
    periodName: '午间复习',
    title: `源哥投资铁律：${rule.title}`,
    content: rule.content,
    keyPoints: [
      rule.content,
      `出处：${rule.source}`,
      '结合当前持仓分析实战应用场景',
    ],
    practicalApplication: getPracticalApplication(rule.id),
    knowledgeLink: rule.title,
  };
}

function getPracticalApplication(ruleId: string): string {
  const applications: Record<string, string> = {
    'r1': '当前159140净值在1.42附近，尚未到达1.37黄金坑阈值，严格执行"不见兔子不撒鹰"，不提前建仓。',
    'r2': '若黄金坑触发，第一笔只投30%（约3.6%总仓位），确认趋势后第二笔30%，最后40%加仓，绝不满仓梭哈。',
    'r3': '159140当前1.42已超过1.37黄金坑阈值，说明不在买点区域，严禁追高买入。',
    'r4': '当前距2026年11月止损节点还有数月，若期间AI赛道未创新高，必须执行时间止损，仓位压至20%以下。',
    'r5': '理解投资本质是"卖规则"——严格执行3-3-4建仓法就是卖给自己一个确定性规则，而非靠情绪决策。',
    'r6': '投资属于七段以上财富路径，需要耐心和纪律，不因短期波动改变长期策略。',
    'r7': '宝盈备用金半年不动就是现金守恒，极端行情时这笔流动性的价值远大于追涨收益。',
  };
  return applications[ruleId] || '结合当前持仓严格执行铁律。';
}

// 收盘学习复盘（15:15）
function getCloseLearning() {
  const dayOfWeek = new Date().getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const cases = HISTORY_CASES || [];
  const case_ = cases[dayIndex % cases.length] || cases[0];

  return {
    period: 'close',
    periodName: '收盘学习复盘',
    title: `历史行情对照：${case_.name}`,
    content: case_.description,
    keyPoints: [
      `回调幅度：${case_.callbackRange}`,
      `反弹规律：${case_.reboundRule}`,
      `与当前行情相似度：${case_.similarity}`,
    ],
    learningNotes: `【${case_.name}要点】回调${case_.callbackRange}后${case_.reboundRule}。当前行情相似度评估：${case_.similarity}。应借鉴历史制定今日操作策略。`,
    tomorrowPreview: '明日重点：结合今日行情更新周期推演，核验三档买点是否触发',
    knowledgeLink: '历史行情案例拆解',
  };
}

// 早间严选播报（09:30）
function getMorningYanxuan() {
  const cycle = getCyclePhase();
  return {
    period: 'morning',
    title: '早间严选核心播报',
    cycleAnalysis: CYCLE_THEORIES.map((c) => `${c.name}：当前${c.currentPhase}，对AI影响——${c.impactOnAI}`).join('\n'),
    riskPoints: [
      '科创50是否站稳1200点（满仓条件之一）',
      '美联储议息会议预期对成长股估值影响',
      '半导体板块集体回调/上涨逻辑',
    ],
    positionAdvice: `当前处于半年周期【${cycle.phaseName}】，早盘不操作，尾盘核查买点`,
    phaseNote: `当前阶段：${cycle.phaseName} | 距国庆止盈${cycle.daysToNationalDay}天 | 距11月止损${cycle.daysToNovember}天`,
    learningReminder: '今日重点掌握：周期轮动与AI赛道相关性',
  };
}

// 尾盘严选播报（14:30）
function getAfternoonYanxuan() {
  const cycle = getCyclePhase();
  return {
    period: 'afternoon',
    title: '尾盘严选核心播报',
    cycleAnalysis: '源哥3-3-4建仓法实时校验：核心标的买点是否触发',
    riskPoints: [
      '159140/022364实时净值核对三档买点阈值',
      '4只自有基金净值波动对AI主线联动影响',
      '是否适合动用新能源/宝盈备用金加仓核心AI基金',
    ],
    positionAdvice: '复习"不见兔子不撒鹰"铁律，买点未触发坚决不动',
    phaseNote: `距11月止损节点${cycle.daysToNovember}天 | ${cycle.phaseName}`,
    learningReminder: '复习铁律：不见兔子不撒鹰在当前行情的应用',
  };
}

// 收盘严选播报（15:05）
function getCloseYanxuan() {
  const cycle = getCyclePhase();
  return {
    period: 'close',
    title: '收盘严选核心播报',
    cycleAnalysis: HISTORY_CASES.map((h) => `${h.name}同幅度走势对比：${h.similarity}`).join('\n'),
    riskPoints: [
      '当日半导体回调幅度vs 2023AI行情同阶段对比',
      '修正基准/悲观/极端行情预期',
      `距国庆止盈窗口${cycle.daysToNationalDay}天，距11月止损节点${cycle.daysToNovember}天`,
    ],
    positionAdvice: '今日学习内容复盘 + 明日学习重点预告',
    phaseNote: `半年周期阶段：${cycle.phaseName} | 收尾倒计时${cycle.daysToNovember}天`,
    learningReminder: '今日学习内容复盘 + 明日重点：周期推演更新',
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'status';

  if (action === 'status') {
    // 返回当前调度状态
    const period = getCurrentPeriod();
    const cycle = getCyclePhase();
    const workday = isWorkday();
    const friday = isFriday();

    return NextResponse.json({
      disclaimer: DISCLAIMER,
      isWorkday: workday,
      isFriday: friday,
      currentPeriod: period,
      cycle,
      nextActions: getNextAction(period, workday, friday),
      timestamp: new Date().toISOString(),
    });
  }

  if (action === 'morning_learning') {
    try {
      return NextResponse.json({
        disclaimer: DISCLAIMER,
        ...getMorningLearning(),
      });
    } catch (e) {
      return NextResponse.json({ error: '早间学习内容生成失败', detail: String(e) }, { status: 500 });
    }
  }

  if (action === 'noon_review') {
    try {
      return NextResponse.json({
        disclaimer: DISCLAIMER,
        ...getNoonReview(),
      });
    } catch (e) {
      return NextResponse.json({ error: '午间复习内容生成失败', detail: String(e) }, { status: 500 });
    }
  }

  if (action === 'close_learning') {
    try {
      return NextResponse.json({
        disclaimer: DISCLAIMER,
        ...getCloseLearning(),
      });
    } catch (e) {
      return NextResponse.json({ error: '收盘学习内容生成失败', detail: String(e) }, { status: 500 });
    }
  }

  if (action === 'morning_yanxuan') {
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      ...getMorningYanxuan(),
    });
  }

  if (action === 'afternoon_yanxuan') {
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      ...getAfternoonYanxuan(),
    });
  }

  if (action === 'close_yanxuan') {
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      ...getCloseYanxuan(),
    });
  }

  if (action === 'all_content') {
    // 返回当日全部定时内容
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      currentPeriod: getCurrentPeriod(),
      cycle: getCyclePhase(),
      morningLearning: getMorningLearning(),
      noonReview: getNoonReview(),
      closeLearning: getCloseLearning(),
      morningYanxuan: getMorningYanxuan(),
      afternoonYanxuan: getAfternoonYanxuan(),
      closeYanxuan: getCloseYanxuan(),
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function getNextAction(period: string, workday: boolean, friday: boolean): string[] {
  if (!workday) return ['周末休市，下周一09:20早间学习'];

  const actions: Record<string, string[]> = {
    'pre_market': ['等待09:20早间学习推送'],
    'morning_learning': ['阅读周期理论学习', '完成3道检验题'],
    'morning_report': ['查看早间严选播报', '关注外围风险'],
    'noon_review': ['复习今日投资铁律', '结合持仓分析实战应用'],
    'afternoon_scan': ['执行尾盘买点扫描', '核验4只自有基金波动'],
    'close_archive': ['查看收盘台账归档', '核对AI仓位占比'],
    'close_learning': ['完成收盘学习复盘', '生成当日学习笔记'],
    'weekly_review': friday ? ['查看周度全景复盘'] : [],
    'weekly_exam': friday ? ['完成周度学习考核10题'] : [],
    'after_hours': ['盘后休息，明日继续'],
  };

  return actions[period] || [];
}
