// 源哥 AI 基金监控系统 - 核心数据类型与常量

// ========== 基金类型 ==========
export interface Fund {
  code: string;
  name: string;
  shortName: string;
  type: 'etf' | 'active' | 'index';
  category: 'ai_core' | 'ai_semi' | 'backup' | 'non_ai';
  isUserHolding: boolean;
  // 买入阈值
  buyPoints?: {
    golden?: number;  // 黄金坑第一买点
    diamond?: number; // 钻石坑第二买点
    preOrder?: number; // 预埋单价格
  };
  // 用户持仓信息
  holding?: {
    shares: number;      // 持有份额
    costNav: number;     // 成本净值
    currentNav: number;  // 当前净值
    profitRate: number;  // 浮盈亏比例
  };
  // 半年周期规则
  cycleRules?: {
    stopProfitThreshold?: number; // 止盈触发阈值（涨幅%）
    stopLossThreshold?: number;   // 止损触发阈值（亏损%）
    canAddPosition?: boolean;     // 是否可加仓
    priority?: 'high' | 'medium' | 'low'; // 赎回优先级
    notes: string;                // 特别提示
  };
}

// ========== 预警等级 ==========
export type AlertLevel = 'normal' | 'yellow' | 'red';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  fundCode?: string;
  timestamp: Date;
  action: string; // 处置建议
  knowledgeLink?: string; // 关联源哥言商知识点
}

// ========== 买入信号 ==========
export type BuySignalTier = 1 | 2 | 3;

export interface BuySignal {
  fundCode: string;
  tier: BuySignalTier;
  tierName: string;
  threshold: number;
  currentNav: number;
  isTriggered: boolean;
  positionRatio: string; // 建议仓位比例
  description: string;
  knowledgeLink: string; // 关联知识点
}

// ========== 满仓条件 ==========
export interface FullPositionCheck {
  consecutive3Up: boolean;      // 连3阳线
  volume15x: boolean;           // 成交量1.5倍20日均
  maTurnUp: boolean;            // 5/3日均线拐头
  star50Above1200: boolean;     // 科创50站稳1200点
  metCount: number;
  isReady: boolean;
}

// ========== 学习模块 ==========
export type LearningPeriod = 'morning' | 'noon' | 'close' | 'weekly';

export interface LearningContent {
  period: LearningPeriod;
  periodName: string;
  title: string;
  content: string;
  keyPoints: string[];
  quizzes?: Quiz[];
  knowledgeLink: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  source?: string; // 源哥原文出处
}

export interface LearningProgress {
  date: string;
  morningCompleted: boolean;
  noonCompleted: boolean;
  closeCompleted: boolean;
  weeklyScore?: number;
  totalQuizzesCorrect: number;
  totalQuizzesTaken: number;
  unlockedContent: string[];
}

// ========== 持仓台账 ==========
export interface PortfolioRecord {
  id: string;
  date: string;
  fundCode: string;
  action: 'buy' | 'sell' | 'add' | 'reduce';
  nav: number;
  amount: number;
  shares: number;
  notes: string;
}

// ========== 半年周期 ==========
export interface SemiAnnualCycle {
  startDate: string;   // 2026-05-29
  phase: 'layout' | 'profit' | 'stop' | 'final';
  phaseName: string;
  daysElapsed: number;
  daysToNationalDay: number;   // 国庆止盈
  daysToNovember: number;      // 11月止损
  currentAlert: string;
}

// ========== 严选播报 ==========
export interface YanxuanReport {
  period: 'morning' | 'afternoon' | 'close' | 'weekly';
  title: string;
  cycleAnalysis: string;      // 三大周期推演
  riskPoints: string[];       // 严选风险点
  positionAdvice: string;     // 持仓建议
  phaseNote: string;          // 半年周期阶段提示
  learningReminder: string;   // 学习提醒
}

// ========== 交互指令 ==========
export type CommandType =
  | 'buy_check'        // 今日买点检测
  | 'full_portfolio'   // 全持仓台账
  | 'yanxuan'          // 源哥今日严选
  | 'learning'         // 源哥今日学习
  | 'learning_progress'// 学习进度查询
  | 'risk_overview'    // 外围风险速览
  | 'weekly_report'    // 周度复盘报告
  | 'risk_rules'       // 风控铁律查询
  | 'full_check'       // 满仓条件复核
  | 'update_ledger'    // 更新台账
  | 'cycle_hint'       // 半年周期提示
  | 'holding_analysis' // 自有持仓分析
  | 'knowledge_query'  // 源哥知识点查询
  | 'free_chat';       // 自由对话

export interface CommandResult {
  command: CommandType;
  content: string;
  timestamp: Date;
}

// ========== 全局状态 ==========
export type TabId = 'overview' | 'buy' | 'portfolio' | 'learning' | 'risk' | 'command';

export interface AppState {
  funds: Fund[];
  alerts: Alert[];
  buySignals: BuySignal[];
  fullPositionCheck: FullPositionCheck;
  learningContents: LearningContent[];
  learningProgress: LearningProgress;
  portfolioRecords: PortfolioRecord[];
  cycle: SemiAnnualCycle;
  yanxuanReports: YanxuanReport[];
}
