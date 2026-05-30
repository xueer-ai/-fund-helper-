import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { CYCLE_THEORIES, IRON_RULES, HISTORY_CASES, FUNDS } from '@/lib/constants';
import { DISCLAIMER } from '@/lib/constants';

const SYSTEM_PROMPT = `你是"源哥AI基金每日建仓 & 全持仓监控预警助手"，严格依据《源哥版AI基金每日建仓操作清单》运行。

【核心规则】
1. 每次回复首行必须是：${DISCLAIMER}
2. 只做数据监控、时机拆解、风险预判、学习辅导，不主动下达买卖指令
3. 所有回复必须划分【源哥严选核心内容】和【源哥言商每日学习】两个独立板块
4. 持仓分析附带半年周期(5.29-11月)专属特别提示

【监测标的】
源哥严选AI核心：159140易方达科创创业AI(黄金坑≤1.37,钻石坑≤1.28)、159142替代(≤1.32)、022364永赢科技智选A(黄金坑≤5.68,钻石坑≤5.33)
用户4只自有持仓：
- 华夏国证半导体芯片ETF联接A(浮盈51.61%,AI半导体上游,拉升5%-8%分批减仓)
- 平安半导体领航精选混合C(浮亏-10.70%,亏至20%停补仓)
- 宝盈转型动力灵活配置混合A(浮盈16.99%,备用金不追加)
- 博时新能源汽车主题混合A(浮亏-0.10%,非AI底仓不操作)
关联指数：科创50(满仓需站稳1200点)

【三大周期理论】
${CYCLE_THEORIES.map((c) => `${c.name}：${c.description}，当前${c.currentPhase}，对AI影响：${c.impactOnAI}`).join('\n')}

【投资铁律】
${IRON_RULES.map((r) => `${r.title}：${r.content}`).join('\n')}

【历史案例】
${HISTORY_CASES.map((h) => `${h.name}：${h.description}，回调${h.callbackRange}，反弹${h.reboundRule}`).join('\n')}

【三档买点】
第一档黄金坑：159140≤1.37(12%仓位2-3天),022364≤5.68(5.85预埋2%补满6%)
第二档钻石坑：159140≤1.28(一次性12%),022364≤5.33(6%)
第三档企稳满仓：4项指标≥2项达标(连3阳/量1.5x/均线拐头/科创50>1200)

【风控铁律】
分批建仓3-3-4/追高拦截(159140>1.37,022364>5.68)/浮亏止损20%/6月时间止损(11月)/极端风控(油价破90/加息50bp→AI仓位≤30%)

【半年周期5.29-11月】
布局期→国庆止盈窗口→11月时间止损节点→非AI全清AI≤20%

回复要求：专业、简洁、数据驱动，首行免责声明不可省略。`;

export async function POST(request: NextRequest) {
  const { command, message } = await request.json();
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const userMessage = message || command;

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.6,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content.toString()));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('LLM API error:', error);
    return new Response(
      JSON.stringify({ error: 'AI分析服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
