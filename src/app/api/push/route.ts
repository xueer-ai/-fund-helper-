import { NextRequest, NextResponse } from 'next/server';
import { DISCLAIMER } from '@/lib/constants';

// ========== Server酱微信推送 API ==========

// Server酱推送接口（Turbo版 sctapi.ftqq.com）
const SCT_API_BASE = 'https://sctapi.ftqq.com';

// 推送消息类型
type PushType = 'buy_signal' | 'risk_alert' | 'learning' | 'yanxuan' | 'test' | 'daily_summary';

interface PushMessage {
  title: string;
  content: string;  // Markdown格式
  type: PushType;
}

// 从环境变量或请求中获取SendKey
function getSendKey(request?: NextRequest): string | null {
  // 优先从环境变量读取
  const envKey = process.env.SERVERCHAN_SENDKEY;
  if (envKey) return envKey;
  return null;
}

// 发送Server酱推送
async function sendToServerChan(sendKey: string, message: PushMessage): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${SCT_API_BASE}/${sendKey}.send`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `【源哥AI监控】${message.title}`,
        desp: `${DISCLAIMER}\n\n---\n\n${message.content}`,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    if (data.code === 0 || data.code === 200) {
      return { success: true };
    }
    return { success: false, error: data.message || '推送失败' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '网络错误';
    return { success: false, error: errorMsg };
  }
}

// 构建买点信号推送内容
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
    : '买点扫描完成（暂无触发）';

  let content = '## 买点信号扫描结果\n\n';
  if (triggered.length > 0) {
    content += '### 已触发信号\n\n';
    for (const s of triggered) {
      content += `- **${s.fundCode}** ${s.tierName}：当前净值 ${s.currentNav}，阈值 ${s.threshold}\n`;
      content += `  > ${s.description}\n`;
      content += `  > 关联知识点：${s.knowledgeLink}\n\n`;
    }
  } else {
    content += '当前所有标的均未触发买点阈值，继续耐心等待。\n\n';
  }

  content += '### 全部信号状态\n\n';
  content += '| 基金 | 档位 | 阈值 | 当前净值 | 状态 |\n';
  content += '|------|------|------|----------|------|\n';
  for (const s of signals) {
    const status = s.isTriggered ? '✅ 已触发' : '⬜ 未触发';
    content += `| ${s.fundCode} | ${s.tierName} | ${s.threshold} | ${s.currentNav} | ${status} |\n`;
  }

  return { title, content, type: 'buy_signal' };
}

// 构建风控预警推送内容
function buildRiskAlertContent(alerts: Array<{
  level: string;
  title: string;
  message: string;
  action: string;
  knowledgeLink?: string;
}>): PushMessage {
  const redAlerts = alerts.filter(a => a.level === 'red');
  const yellowAlerts = alerts.filter(a => a.level === 'yellow');
  const title = redAlerts.length > 0
    ? `红色预警！${redAlerts.length}个紧急风险`
    : yellowAlerts.length > 0
    ? `黄色预警·${yellowAlerts.length}个风险`
    : '风控扫描完成（正常）';

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
    content += '当前无风险预警，所有指标正常。\n';
  }

  return { title, content, type: 'risk_alert' };
}

// 构建学习推送内容
function buildLearningContent(data: {
  periodName: string;
  title: string;
  content: string;
  keyPoints: string[];
  quizzes?: Array<{ question: string; options: string[] }>;
}): PushMessage {
  const title_str = `学习·${data.periodName}：${data.title}`;
  let content = `## ${data.title}\n\n`;
  content += `${data.content}\n\n`;
  content += '### 核心要点\n\n';
  for (const p of data.keyPoints) {
    content += `- ${p}\n`;
  }
  if (data.quizzes && data.quizzes.length > 0) {
    content += '\n### 检验题目\n\n';
    data.quizzes.forEach((q, i) => {
      content += `**${i + 1}. ${q.question}**\n`;
      q.options.forEach((opt, j) => {
        content += `  ${String.fromCharCode(65 + j)}. ${opt}\n`;
      });
      content += '\n';
    });
  }

  return { title: title_str, content, type: 'learning' };
}

// 构建严选播报推送内容
function buildYanxuanContent(data: {
  period: string;
  cycleAnalysis: string;
  riskPoints: string[];
  operationHints: string[];
  learningReminder: string;
}): PushMessage {
  const title = `源哥严选·${data.period}`;
  let content = `## 源哥严选核心播报\n\n`;
  content += `### 三大周期推演\n${data.cycleAnalysis}\n\n`;
  content += '### 风险点\n';
  for (const r of data.riskPoints) {
    content += `- ${r}\n`;
  }
  content += '\n### 操作提示\n';
  for (const h of data.operationHints) {
    content += `- ${h}\n`;
  }
  content += `\n> 学习提醒：${data.learningReminder}\n`;

  return { title, content, type: 'yanxuan' };
}

// POST: 发送推送
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sendKey: reqSendKey, type, data } = body;

    const sendKey = reqSendKey || getSendKey(request);
    if (!sendKey) {
      return NextResponse.json(
        { success: false, error: '未配置Server酱SendKey，请在设置中填入' },
        { status: 400 }
      );
    }

    let message: PushMessage;

    switch (type) {
      case 'test':
        message = {
          title: '连接测试成功',
          content: '微信推送通道已打通！后续买点触发、风控预警、学习提醒将自动推送到微信。\n\n推送内容类型：\n- 买点信号触发提醒\n- 风控预警（黄色/红色）\n- 源哥言商学习内容\n- 源哥严选核心播报',
          type: 'test',
        };
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
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `未知的推送类型: ${type}` },
          { status: 400 }
        );
    }

    const result = await sendToServerChan(sendKey, message);
    return NextResponse.json({
      disclaimer: DISCLAIMER,
      ...result,
      pushType: type,
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

// GET: 检查推送配置状态
export async function GET() {
  const hasSendKey = !!process.env.SERVERCHAN_SENDKEY;
  return NextResponse.json({
    disclaimer: DISCLAIMER,
    configured: hasSendKey,
    message: hasSendKey
      ? 'Server酱已配置，推送功能可用'
      : '未配置Server酱 SendKey，请在设置面板中填入',
    guide: {
      step1: '关注微信公众号「Server酱」',
      step2: '访问 sct.ftqq.com 注册并获取 SendKey',
      step3: '在下方输入框填入 SendKey 并点击测试',
      step4: '微信将收到测试消息，确认通道畅通',
    },
  });
}
