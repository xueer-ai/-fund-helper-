// 源哥 AI 基金监控系统 - 基金常量与初始数据

import type { Fund, LearningContent, Quiz } from './types';
import type { FundPriceParams } from './types';

// ========== 运维参数 ==========
// 回测模式开关：true时使用回测参数（不触发线上预警和推送）
export const IS_BACKTEST_MODE = false;

// 推送防骚扰：同一基金24小时内最多推送1次
export const PUSH_COOLDOWN_HOURS = 24;

// 推送静默规则：以下状态不推送（只有状态变化才推）
export const PUSH_SILENT_STATUS: string[] = ['持有', '观望'];

// ========== 8 只监测基金 ==========
export const FUNDS: Fund[] = [
  // ---- 源哥严选 AI 核心建仓标的 ----
  {
    code: '159140',
    name: '易方达科创创业AI',
    shortName: '科创AI',
    type: 'etf',
    category: 'ai_core',
    isUserHolding: false,
    buyPoints: {
      golden: 1.37,  // 回调20%
      diamond: 1.28, // 回调25%
    },
    cycleRules: {
      canAddPosition: true,
      notes: 'AI核心标的，3-3-4分批建仓，黄金坑12%仓位，钻石坑12%仓位',
    },
  },
  {
    code: '159142',
    name: '替代标的',
    shortName: '替代ETF',
    type: 'etf',
    category: 'ai_core',
    isUserHolding: false,
    buyPoints: {
      golden: 1.32, // 替代159140
    },
    cycleRules: {
      canAddPosition: true,
      notes: '159140替代标的，阈值1.32，仓位一致',
    },
  },
  {
    code: '022364',
    name: '永赢科技智选A',
    shortName: '永赢科技',
    type: 'active',
    category: 'ai_core',
    isUserHolding: false,
    buyPoints: {
      golden: 5.68,  // 回调20%
      diamond: 5.33, // 回调25%
      preOrder: 5.85, // 预埋2%
    },
    cycleRules: {
      canAddPosition: true,
      notes: '主动核心基金，5.85预埋2%→到位补满6%尾盘操作',
    },
  },
  // ---- 用户自有持仓基金 ----
  {
    code: '华夏芯片',
    name: '华夏国证半导体芯片ETF联接A',
    shortName: '华夏芯片',
    type: 'etf',
    category: 'ai_semi',
    isUserHolding: true,
    holding: {
      shares: 0,
      costNav: 1.4194,
      currentNav: 0,
      profitRate: 51.61,
    },
    priceParams: {
      costPrice: 1.4194,
      tp: 1.5613,           // +10%止盈目标
      sl: 1.1355,           // -20%硬止损（大肉仓安全垫厚，给更宽空间）
      tStop: {
        enabled: true,
        highLookbackDays: 60,
        levels: [
          { dropPct: 3, action: '🟡接近减仓区，准备好挂单价' },
          { dropPct: 5, action: '🔴第一批兑现窗口：回撤达5%，可减1/3' },
          { dropPct: 8, action: '🔴第二批兑现：回撤达8%，再减1/3' },
        ],
      },
      buyZone: { enabled: false, levels: [], extraConditions: ['不建议再加仓，先把利润落袋'] },
      minBuyIntervalDays: 999, // 禁止加仓
      minBuyDropPct: 999,
      role: '右侧盈利·要保利润',
    },
    cycleRules: {
      stopProfitThreshold: 8,
      canAddPosition: false,
      priority: 'low',
      notes: '右侧盈利仓，动态止盈回撤保护；拉升5%-8%分批减仓锁利；保留小底仓博弈国庆窗口；指数基金禁止T+0',
    },
  },
  {
    code: '平安半导体',
    name: '平安半导体领航精选混合C',
    shortName: '平安半导体',
    type: 'active',
    category: 'ai_semi',
    isUserHolding: true,
    holding: {
      shares: 0,
      costNav: 1.4950,
      currentNav: 0,
      profitRate: -10.70,
    },
    priceParams: {
      costPrice: 1.4950,
      tp: 1.6744,           // +12%先求回本+缓冲
      sl: 1.3455,           // -10%硬止损
      tStop: { enabled: false, highLookbackDays: 0, levels: [] }, // 未到盈利兑现阶段
      buyZone: {
        enabled: true,
        levels: [
          { price: 1.4200, label: '补仓观察点1' },
          { price: 1.3450, label: '补仓观察点2（近SL）' },
        ],
        extraConditions: ['补仓闸门关闭，直到满足间距≥10交易日+大盘不极端', '至少再跌5%才考虑第二批'],
      },
      minBuyIntervalDays: 10,
      minBuyDropPct: 5,
      role: '左侧被套·波动大',
    },
    cycleRules: {
      stopLossThreshold: 10, // 改为10%硬止损（用户参数版）
      canAddPosition: false,
      priority: 'medium',
      notes: 'C类适合波段不建议长拿；今估≥1.4200属等待回归区🟢；今估≤1.3455触🔴认错警戒；补仓须满足间距+大盘不极端',
    },
  },
  {
    code: '宝盈转型',
    name: '宝盈转型动力灵活配置混合A',
    shortName: '宝盈转型',
    type: 'active',
    category: 'backup',
    isUserHolding: true,
    holding: {
      shares: 0,
      costNav: 3.5577,
      currentNav: 0,
      profitRate: 16.99,
    },
    priceParams: {
      costPrice: 3.5577,
      tp: 3.9135,           // +10%止盈目标
      sl: 3.2731,           // -8%硬止损
      tStop: {
        enabled: true,
        highLookbackDays: 60,
        levels: [
          { dropPct: 0, action: '趋势线规则：收盘<20MA且次日不能收回→减仓/警戒' },
        ],
      },
      buyZone: { enabled: false, levels: [], extraConditions: ['不加仓直到趋势重新站上20MA'] },
      minBuyIntervalDays: 999,
      minBuyDropPct: 999,
      role: '趋势跟随·均衡灵活',
    },
    cycleRules: {
      canAddPosition: false,
      priority: 'high',
      notes: '非AI主线，应急备用金；不加仓直到趋势重新站上20MA；收盘<20MA且次日不收回→减仓警戒；极端风险优先赎回；11月前无行情清仓',
    },
  },
  {
    code: '博时新能源',
    name: '博时新能源汽车主题混合A',
    shortName: '博时新能源',
    type: 'active',
    category: 'non_ai',
    isUserHolding: true,
    holding: {
      shares: 0,
      costNav: 1.0949,
      currentNav: 0,
      profitRate: -0.10,
    },
    priceParams: {
      costPrice: 1.0949,
      tp: undefined as unknown as number, // 暂不设激进TP
      sl: 0.9635,            // -12%硬止损（主题基允许略宽）
      tStop: { enabled: false, highLookbackDays: 0, levels: [] },
      buyZone: {
        enabled: true,
        levels: [
          { price: 1.02, label: '极小仓试探点' },
        ],
        extraConditions: ['只有同时满足：①≤1.02 ②距上次买≥14天 ③大盘不暴跌（单日-2%内）→才极小仓试'],
      },
      minBuyIntervalDays: 14,
      minBuyDropPct: 5,
      role: '主题周期·平本附近',
    },
    cycleRules: {
      canAddPosition: false,
      priority: 'high',
      notes: '非AI赛道底仓，保本/微利前BuyZone不开闸；11月未启动则全额清仓回流AI赛道',
    },
  },
  {
    code: '科创50',
    name: '科创50指数',
    shortName: '科创50',
    type: 'index',
    category: 'ai_core',
    isUserHolding: false,
    cycleRules: {
      canAddPosition: false,
      notes: '关联参考指数，满仓企稳需科创50站稳1200点',
    },
  },
];

// ========== 源哥投资铁律清单（午间复习滚动） ==========
export const IRON_RULES = [
  {
    id: 'r1',
    title: '不见兔子不撒鹰',
    content: '严格按触发条件执行，没有到阈值绝不动手',
    source: '源哥言商·投资铁律',
  },
  {
    id: 'r2',
    title: '分批建仓3-3-4法则',
    content: '第一笔30%试探，第二笔30%确认，第三笔40%加仓，杜绝一次性满仓',
    source: '源哥言商·建仓方法论',
  },
  {
    id: 'r3',
    title: '追高是亏损根源',
    content: '严守净值红线，159140>1.37、022364>5.68劝阻一切新开仓',
    source: '源哥言商·风险控制',
  },
  {
    id: 'r4',
    title: '时间止损比价格止损更重要',
    content: '2026年11月节点，未创新高则AI仓位压至20%以下',
    source: '源哥言商·周期理论',
  },
  {
    id: 'r5',
    title: '卖的5大层次',
    content: '从卖情绪→卖故事→卖产品→卖标准→卖规则，理解商业底层逻辑',
    source: '源哥言商·商业思维',
  },
  {
    id: 'r6',
    title: '人生九段论与财富积累',
    content: '理解不同段位对应的财富积累方式，投资是七段以上的财富路径',
    source: '源哥言商·人生智慧',
  },
  {
    id: 'r7',
    title: '现金财富守恒定律',
    content: '流动性资产的核心价值，宝盈备用金半年不动就是守恒',
    source: '源哥言商·财富管理',
  },
];

// ========== 三大周期理论 ==========
export const CYCLE_THEORIES = [
  {
    id: 'c1',
    name: 'AI科技主线周期',
    description: 'AI赛道从萌芽→主升→回调→再主升的轮动规律，当前处于主升浪回调期',
    impactOnAI: '直接决定159140/022364净值走势，回调20%进入黄金坑',
    currentPhase: '主升浪回调期',
  },
  {
    id: 'c2',
    name: '美联储加息周期',
    description: '加息→缩表→降息的完整周期，影响全球科技股估值中枢',
    impactOnAI: '加息压制估值，降息利好成长，CME预期是前瞻指标',
    currentPhase: '加息尾声/降息预期期',
  },
  {
    id: 'c3',
    name: '大宗商品油价周期',
    description: '油价波动影响通胀预期与货币政策节奏，油价破90触发三级预警',
    impactOnAI: '高油价→通胀→加息预期→AI估值承压',
    currentPhase: '中位震荡期',
  },
];

// ========== 历史行情案例 ==========
export const HISTORY_CASES = [
  {
    id: 'h1',
    name: '2023年AI行情',
    description: 'ChatGPT引爆AI行情，科创创业相关指数从底部反弹超80%，后回调约30%企稳',
    callbackRange: '25%-35%',
    reboundRule: '企稳后2-3个月内再创新高',
    similarity: '高——当前同样是AI技术突破驱动的行情',
  },
  {
    id: 'h2',
    name: '1999年519行情',
    description: '5月19日启动的互联网行情，指数31天涨幅66%，后续2年回调至起点',
    callbackRange: '40%-60%',
    reboundRule: '仅第一波参与者获利，追高者深度套牢',
    similarity: '中——同样是技术革命驱动，但市场结构已变',
  },
];

// ========== 交互指令映射 ==========
export const COMMAND_MAP: Record<string, { label: string; type: string; icon: string }> = {
  '今日买点检测': { label: '扫描核心标的买入条件', type: 'buy_check', icon: '🎯' },
  '全持仓台账': { label: '输出8只基金仓位盈亏', type: 'full_portfolio', icon: '📊' },
  '源哥今日严选': { label: '当日严选核心解读+半年提示', type: 'yanxuan', icon: '🔥' },
  '源哥今日学习': { label: '当日必掌握学习内容+检验题', type: 'learning', icon: '📖' },
  '学习进度查询': { label: '学习完成情况/错题/考核', type: 'learning_progress', icon: '📝' },
  '外围风险速览': { label: '加息/油价风险预判', type: 'risk_overview', icon: '🌍' },
  '周度复盘报告': { label: '全基金行情+周期推演', type: 'weekly_report', icon: '📋' },
  '风控铁律查询': { label: '止损/时间止损/极端规则', type: 'risk_rules', icon: '🛡️' },
  '满仓条件复核': { label: '核验4项企稳指标', type: 'full_check', icon: '✅' },
  '更新台账': { label: '录入基金买卖记录', type: 'update_ledger', icon: '✏️' },
  '半年周期提示': { label: '5.29-11月分阶段计划', type: 'cycle_hint', icon: '⏰' },
  '自有持仓分析': { label: '4只持仓专项拆解', type: 'holding_analysis', icon: '🔍' },
  '源哥知识点查询': { label: '搜索源哥理论/铁律', type: 'knowledge_query', icon: '💡' },
};

// ========== 免责声明 ==========
export const DISCLAIMER = '⚠️ 重要提示：内容仅为逻辑推演复盘，不构成任何基金、理财投资建议，市场有波动，入市需谨慎';

// ========== 半年周期关键日期 ==========
export const CYCLE_DATES = {
  start: new Date('2026-05-29'),
  nationalDay: new Date('2026-10-01'), // 国庆止盈窗口
  november: new Date('2026-11-30'),    // 11月止损节点
};
