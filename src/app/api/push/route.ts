import { NextRequest, NextResponse } from 'next/server';
import { DISCLAIMER, PUSH_COOLDOWN_HOURS, PUSH_SILENT_STATUS, IS_BACKTEST_MODE } from '@/lib/constants';

// ========== Server酱微信推送 API（进阶版：分级推送+防骚扰+模版优化） ==========

const SCT_API_BASE = 'https://sctapi.ftqq.com';

// 推送级别：red=紧急止损 yellow=止盈提醒 green=买点机会
type PushLevel = 'red' | 'yellow' | 'green' | 'info';
type PushType = 'stop_loss' | 'trailing_stop' | 'buy_signal' | 'risk_alert' | 'learning' | 'yanxuan' | 'test' | 'daily_summary';

interface PushMessage {
  title: string;
  content: string;
  type: PushType;
  level: PushLevel;
  fundCode?: string; // 用于防骚扰去重
}

// ========== 防骚扰：24小时推送冷却 ==========
const pushHistory = new Map<string, number>(); // fundCode -> lastPushTimestamp

function canPush(fundCode: string, level: PushLevel): boolean {
  // 回测模式不推送
  if (IS_BACKTEST_MODE) {
    console.log(`[PUSH-BLOCKED] 回测模式，跳过推送: ${fundCode}`);
    return false;
  }
  // 红色预警不受冷却限制（止损信号必须及时）
  if (level === 'red') return true;
  // 其他级别：24小时冷却
  const lastPush = pushHistory.get(fundCode);
  if (lastPush && Date.now() - lastPush < PUSH_COOLDOWN_HOURS * 60 * 60 * 1000) {
    console.log(`[PUSH-BLOCKED] 24h冷却中，跳过: ${fundCode}`);
    return false;
  }
  return true;
}

function recordPush(fundCode: string): void {
  pushHistory.set(fundCode, Date.now());
}

// 从环境变量或请求中获取SendKey
function getSendKey(request?: NextRequest): string | null {
  const envKey = process.env.SERVERCHAN_SENDKEY;
  if (envKey) return envKey;
  return null;
}

// 发送Server酱推送
async function sendToServerChan(sendKey: string, message: PushMessage): Promise<{ success: boolean; error?: string }> {
  try {
    const levelIcon = message.level === 'red' ? '🚨' : message.level === 'yellow' ? '🟡' : message.level === 'green' ? '🟢' : '📊';
    const url = `${SCT_API_BASE}/${sendKey}.send`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${levelIcon} ${message.title}`,
        desp: `> ${DISCLAIMER}\n\n---\n\n${message.content}`,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (data.code === 0 || data.code === 200) {
      if (message.fundCode) recordPush(message.fundCode);
      return { success: true };
    }
    return { success: false, error: data.message || '推送失败' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '网络错误';
    return { success: false, error: errorMsg };
  }
}

// ========== 三级推送模版 ==========

// 🔴 红色·认错/止损预警
function buildStopLossContent(data: {
  fundName: string;
  fundCode: string;
  costPrice: number;
  currentNav: number;
  changeRate: string;
  stopLossRate: string;
  triggerTime: string;
}): PushMessage {
  const content = `**⚠️ 触发硬性止损线，请立即核查！**

| 项目 | 数值 |
| :--- | :--- |
| **基金名称** | ${data.fundName} |
| **持仓成本价** | ${data.costPrice.toFixed(4)} |
| **当前估算值** | **${data.currentNav.toFixed(4)}** |
| **偏离度** | \`${data.changeRate}%\` |

**📉 源哥策略建议：**
> 纪律大于天。当前已触及预设的 **-${data.stopLossRate}%** 止损位。
> 个人计划：若收盘确认跌破此位置，**执行减仓/清仓**，保留本金等待下次机会。

**🕒 时间：** ${data.triggerTime}
**⚠️ 免责：** 此为个人纪律提醒，不构成投资建议。`;

  return {
    title: `基金止损预警：${data.fundName}`,
    content,
    type: 'stop_loss',
    level: 'red',
    fundCode: data.fundCode,
  };
}

// 🟡 黄色·动态止盈提醒
function buildTrailingStopContent(data: {
  fundName: string;
  fundCode: string;
  highestNav: number;
  currentNav: number;
  drawdownRate: string;
  actionHint: string;
}): PushMessage {
  const content = `**💰 阶段性高点回撤预警，考虑分批止盈。**

| 项目 | 数值 |
| :--- | :--- |
| **基金名称** | ${data.fundName} |
| **历史最高净值** | ${data.highestNav.toFixed(4)} |
| **当前净值** | ${data.currentNav.toFixed(4)} |
| **最大回撤** | \`${data.drawdownRate}%\` |

**📊 源哥策略建议：**
> 1. 若回撤 **≥ 5%**：按计划减仓 **1/3**，锁定部分利润。
> 2. 若继续下跌至 **-8%**：再减 **1/3**，剩余底仓长期持有。
> 3. 若再次放量突破前高，可重新持有等待。

**📌 操作提示：** ${data.actionHint}`;

  return {
    title: `利润兑现提醒：${data.fundName}`,
    content,
    type: 'trailing_stop',
    level: 'yellow',
    fundCode: data.fundCode,
  };
}

// 🟢 绿色·买点信号
function buildBuySignalContent(signals: Array<{
  fundCode: string;
  tierName: string;
  threshold: number;
  currentNav: number;
  isTriggered: boolean;
  description: string;
  knowledgeLink: string;
}>): PushMessage {
  const triggered = signals.filter(s => s.isTriggered);
  const title = triggered.length > 0
    ? `买点触发！${triggered.length}个信号`
    : '买点扫描（暂无触发）';

  let content = '## 买点信号扫描结果\n\n';
  if (triggered.length > 0) {
    content += '### ✅ 已触发信号\n\n';
    for (const s of triggered) {
      content += `- **${s.fundCode}** ${s.tierName}：当前 ${s.currentNav}，阈值 ${s.threshold}\n`;
      content += `  > ${s.description}\n`;
      content += `  > 关联：${s.knowledgeLink}\n\n`;
    }
  } else {
    content += '暂无触发，继续耐心等待。\n\n';
  }

  content += '| 基金 | 档位 | 阈值 | 当前 | 状态 |\n';
  content += '|------|------|------|------|------|\n';
  for (const s of signals) {
    const status = s.isTriggered ? '✅触发' : '⬜未触发';
    content += `| ${s.fundCode} | ${s.tierName} | ${s.threshold} | ${s.currentNav} | ${status} |\n`;
  }

  return {
    title,
    content,
    type: 'buy_signal',
    level: triggered.length > 0 ? 'green' : 'info',
    fundCode: triggered.length > 0 ? triggered[0].fundCode : undefined,
  };
}

// 🟡 风控预警（非止损类）
function buildRiskAlertContent(alerts: Array<{
  level: string;
  title: string;
  message: string;
  action: string;
  knowledgeLink?: string;
}>): PushMessage {
  const redAlerts = alerts.filter(a => a.level === 'red');
  const yellowAlerts = alerts.filter(a => a.level === 'yellow');
  const pushLevel = redAlerts.length > 0 ? 'red' : yellowAlerts.length > 0 ? 'yellow' : 'info';
  const title = redAlerts.length > 0
    ? `红色预警！${redAlerts.length}个紧急风险`
    : yellowAlerts.length > 0
    ? `黄色预警·${yellowAlerts.length}个风险`
    : '风控扫描（正常）';

  let content = '## 风控预警扫描\n\n';
  if (redAlerts.length > 0) {
    content += '### 🔴 红色紧急预警\n\n';
    for (const a of redAlerts) {
      content += `- **${a.title}**\n  ${a.message}\n  处置：${a.action}\n`;
      if (a.knowledgeLink) content += `  关联：${a.knowledgeLink}\n`;
      content += '\n';
    }
  }
  if (yellowAlerts.length > 0) {
    content += '### 🟡 黄色预警\n\n';
    for (const a of yellowAlerts) {
      content += `- **${a.title}**\n  ${a.message}\n  处置：${a.action}\n\n`;
    }
  }
  if (redAlerts.length === 0 && yellowAlerts.length === 0) {
    content += '当前无风险预警。\n';
  }

  return { title, content, type: 'risk_alert', level: pushLevel };
}

// 学习/严选推送（info级别，受冷却限制）
function buildLearningContent(data: {
  periodName: string;
  title: string;
  content: string;
  keyPoints: string[];
}): PushMessage {
  let contentMd = `## ${data.title}\n\n${data.content}\n\n### 核心要点\n\n`;
  for (const p of data.keyPoints) {
    contentMd += `- ${p}\n`;
  }
  return {
    title: `学习·${data.periodName}：${data.title}`,
    content: contentMd,
    type: 'learning',
    level: 'info',
    fundCode: 'learning',
  };
}

function buildYanxuanContent(data: {
  period: string;
  cycleAnalysis: string;
  riskPoints: string[];
  operationHints: string[];
  learningReminder: string;
}): PushMessage {
  let content = `## 源哥严选核心播报\n\n### 三大周期推演\n${data.cycleAnalysis}\n\n### 风险点\n`;
  for (const r of data.riskPoints) content += `- ${r}\n`;
  content += '\n### 操作提示\n';
  for (const h of data.operationHints) content += `- ${h}\n`;
  content += `\n> 学习提醒：${data.learningReminder}\n`;
  return {
    title: `源哥严选·${data.period}`,
    content,
    type: 'yanxuan',
    level: 'info',
    fundCode: 'yanxuan',
  };
}

// ========== POST: 发送推送（含防骚扰检查） ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sendKey: reqSendKey, type, data } = body;

    const sendKey = reqSendKey || getSendKey(request);
    if (!sendKey) {
      return NextResponse.json(
        { success: false, error: '未配置Server酱SendKey' },
        { status: 400 }
      );
    }

    if (IS_BACKTEST_MODE) {
      return NextResponse.json({
        disclaimer: DISCLAIMER,
        success: false,
        error: '回测模式开启，推送已暂停',
        hint: '如需恢复推送，请将 IS_BACKTEST_MODE 设为 false',
      });
    }

    let message: PushMessage;

    switch (type) {
      case 'test':
        message = {
          title: '连接测试成功',
          content: '微信推送通道已打通！\n\n**推送规则说明：**\n- 🔴 红色预警（止损）：不受冷却限制，随时推送\n- 🟡 黄色提醒（止盈）：24小时内同基金只推1次\n- 🟢 绿色信号（买点）：24小时内同基金只推1次\n- 学习/严选：24小时内只推1次\n\n**静默规则：** 持有/观望状态不推送，只有状态变化才推。',
          type: 'test',
          level: 'info',
        };
        break;

      case 'stop_loss':
        message = buildStopLossContent(data);
        break;

      case 'trailing_stop':
        message = buildTrailingStopContent(data);
        break;

      case 'buy_signal':
        message = buildBuySignalContent(data?.signals || []);
        break;

      case 'risk_alert':
        message = buildRiskAlertContent(data?.alerts || []);
        break;

      case 'learning':
        message = buildLearningContent(data || { periodName: '学习', title: '学习内容', content: '', keyPoints: [] });
        break;

      case 'yanxuan':
        message = buildYanxuanContent(data || { period: '播报', cycleAnalysis: '', riskPoints: [], operationHints: [], learningReminder: '' });
        break;

      case 'daily_summary':
        message = {
          title: '每日收盘归档',
          content: data?.content || '今日收盘归档完成，详见系统页面。',
          type: 'daily_summary',
          level: 'info',
          fundCode: 'daily',
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `未知推送类型: ${type}` },
          { status: 400 }
        );
    }

    // 防骚扰检查
    if (message.fundCode && !canPush(message.fundCode, message.level)) {
      return NextResponse.json({
        disclaimer: DISCLAIMER,
        success: false,
        blocked: true,
        reason: `${PUSH_COOLDOWN_HOURS}小时内已推送过 ${message.fundCode}，冷却中`,
        pushType: type,
        pushTitle: message.title,
        hint: '红色止损预警不受冷却限制',
      });
    }

    const result = await sendToServerChan(sendKey, message);
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      ...result,
      pushType: type,
      pushLevel: message.level,
      pushTitle: message.title,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '推送服务异常';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

// ========== GET: 检查推送配置状态 ==========
export async function GET() {
  const hasSendKey = !!process.env.SERVERCHAN_SENDKEY;
  return NextResponse.json({
    disclaimer: DISCLAIMER,
    configured: hasSendKey,
    backtestMode: IS_BACKTEST_MODE,
    cooldownHours: PUSH_COOLDOWN_HOURS,
    silentStatus: PUSH_SILENT_STATUS,
    message: hasSendKey
      ? (IS_BACKTEST_MODE ? '回测模式开启，推送已暂停' : 'Server酱已配置，推送功能可用')
      : '未配置Server酱 SendKey，请在设置面板中填入',
    guide: {
      step1: '关注微信公众号「Server酱」',
      step2: '访问 sct.ft.qq.com 注册并获取 SendKey',
      step3: '在下方输入框填入 SendKey 并点击测试',
      step4: '微信将收到测试消息，确认通道畅通',
    },
    pushRules: {
      red: '止损预警，不受冷却限制，随时推送',
      yellow: '止盈/风控提醒，24h冷却',
      green: '买点信号，24h冷却',
      info: '学习/严选/日报，24h冷却',
    },
  });
}
