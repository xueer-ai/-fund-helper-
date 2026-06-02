'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { COMMAND_MAP, CYCLE_THEORIES, IRON_RULES, HISTORY_CASES, DISCLAIMER } from '@/lib/constants';
import type { CommandType } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// 本地指令处理（不调用LLM的快捷指令）
function handleLocalCommand(type: CommandType): string {
  switch (type) {
    case 'risk_rules':
      return `【风控铁律查询】

1. 分批建仓3-3-4法则
   备用资金（宝盈、新能源）仅能分3批投入159140/022364，禁止一次性梭哈
   [关联学习：3-3-4建仓法]

2. 追高拦截
   159140＞1.37、022364＞5.68，劝阻一切新开仓，包括自有基金腾挪资金
   [关联学习：追高是亏损根源]

3. 浮亏止损
   平安半导体亏至20%立刻停补仓
   [关联学习：价格止损铁律]

4. 6个月时间止损
   2026年11月未创新高，AI仓位压至20%以下，非AI赛道全部清仓
   [关联学习：时间止损铁律]

5. 极端风控
   外围利空出现，优先赎回宝盈、新能源，AI总仓位上限下调至30%
   [关联学习：极端行情应对]`;

    case 'cycle_hint':
      const now = new Date();
      const nd = new Date('2026-10-01');
      const nov = new Date('2026-11-30');
      const daysToND = Math.max(0, Math.ceil((nd.getTime() - now.getTime()) / 86400000));
      const daysToNov = Math.max(0, Math.ceil((nov.getTime() - now.getTime()) / 86400000));
      return `【半年周期提示 5.29-11月】

当前阶段：${daysToND > 60 ? '布局期' : daysToND > 0 ? '止盈期' : daysToNov > 30 ? '止损观察期' : '收尾期'}

分阶段操作计划：
├─ 布局期（5.29-7月底）：耐心等待黄金坑/钻石坑，3-3-4分批建仓
├─ 止盈期（8月-国庆）：华夏芯片分批减仓锁利，保留底仓博弈
├─ 止损观察期（国庆-11月中）：审视AI仓位，未达标则压缩
└─ 收尾期（11月）：时间止损执行，AI仓位≤20%，非AI全清

关键节点倒计时：
• 距国庆止盈窗口：${daysToND}天
• 距11月止损节点：${daysToNov}天

特别提示：
- 华夏芯片每次拉升5%-8%触发分批减仓
- 平安半导体浮亏20%强制止损
- 宝盈/新能源在极端风险时优先赎回
- 11月前无行情全部清仓回流AI赛道`;

    case 'full_check':
      return `【满仓条件复核】

4项企稳指标核验：
┌─────────────────────┬──────┐
│ 指标                 │ 状态 │
├─────────────────────┼──────┤
│ 连3阳线              │ 待验 │
│ 成交量1.5倍20日均     │ 待验 │
│ 5/3日均线拐头         │ 待验 │
│ 科创50站稳1200点      │ 待验 │
└─────────────────────┴──────┘

规则：≥2项达标可执行满仓，分2日补齐剩余24%总计划仓位

[关联学习：趋势确认理论]

提示：需在交易日14:30尾盘扫描时获取实时数据进行核验`;

    case 'knowledge_query':
      return `【源哥知识点查询】

可查询的知识点分类：
1. 三大周期理论
   ${CYCLE_THEORIES.map((c) => `   - ${c.name}：${c.currentPhase}`).join('\n')}

2. 投资铁律（7条）
   ${IRON_RULES.map((r) => `   - ${r.title}`).join('\n')}

3. 历史行情案例
   ${HISTORY_CASES.map((h) => `   - ${h.name}：回调${h.callbackRange}`).join('\n')}

4. 建仓方法论
   - 3-3-4分批建仓法
   - 黄金坑/钻石坑定义
   - 满仓企稳4项指标

5. 风控体系
   - 价格止损 / 时间止损
   - 极端行情应对
   - 追高拦截机制

请输入具体知识点名称进行查询，如"3-3-4建仓法"`;

    default:
      return '';
  }
}

export function CommandPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `源哥AI基金监控助手已就绪。

可用指令：
${Object.keys(COMMAND_MAP).map((k) => `• ${k}`).join('\n')}

也可直接输入问题，AI将基于源哥言商知识库进行分析。`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleQuickCommand = useCallback((cmdType: string) => {
    const localResult = handleLocalCommand(cmdType as CommandType);
    if (localResult) {
      const cmdName = Object.entries(COMMAND_MAP).find(([, v]) => v.type === cmdType)?.[0] || cmdType;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content: `【${cmdName}】`,
          timestamp: new Date(),
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: localResult,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // 需要调用LLM的指令
    handleLLMCommand(cmdType as CommandType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLLMCommand = useCallback(async (type: CommandType) => {
    const cmdName = Object.entries(COMMAND_MAP).find(([, v]) => v.type === type)?.[0] || type;
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `【${cmdName}】`,
      timestamp: new Date(),
    };

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: type, message: cmdName }),
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: accumulated } : m
            )
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
          )
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: '请求失败，请稍后重试。', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');

    // 检查是否匹配快捷指令
    const matchedCmd = Object.entries(COMMAND_MAP).find(([name]) => userMessage.includes(name));
    if (matchedCmd) {
      handleQuickCommand(matchedCmd[1].type);
      return;
    }

    // 自由对话 - 调用LLM
    setIsLoading(true);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'free_chat', message: userMessage }),
      });
      if (!response.ok) throw new Error('API请求失败');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: accumulated } : m
            )
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: '请求失败，请稍后重试。', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, handleQuickCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full">
      <p className="text-xs text-gold/90 font-medium mb-3">{DISCLAIMER}</p>

      {/* 快捷指令栏 */}
      <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
        {Object.entries(COMMAND_MAP).map(([name, cmd]) => (
          <button
            key={name}
            onClick={() => handleQuickCommand(cmd.type)}
            disabled={isLoading}
            className="text-xs px-2.5 py-1 rounded bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {name}
          </button>
        ))}
      </div>

      {/* 对话区 */}
      <div className="flex-1 overflow-auto space-y-4 mb-4 pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-primary/20 text-foreground'
                : 'bg-card-bg border border-border text-foreground/90'
            }`}>
              {msg.content}
              {msg.isStreaming && <span className="inline-block w-1.5 h-3 bg-primary/70 animate-pulse ml-0.5" />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入指令或问题..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-xs bg-card-bg border border-border rounded-lg text-foreground placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '...' : '发送'}
        </button>
      </div>
    </div>
  );
}
