'use client';

import { useState, useRef, useEffect } from 'react';

const QUICK_COMMANDS = [
  '今日买点检测',
  '全持仓台账',
  '源哥今日严选',
  '源哥今日学习',
  '学习进度查询',
  '外围风险速递',
  '周度复盘报告',
  '风控铁律查询',
  '满仓条件复核',
  '更新台账',
  '半年周期提示',
  '自有持仓分析',
  '源哥知识点查询',
];

const INSTRUCTION_LIST = [
  '今日买点检测',
  '全持仓台账',
  '源哥今日严选',
  '源哥今日学习',
  '学习进度查询',
  '外围风险速递',
  '周度复盘报告',
  '风控铁律查询',
  '满仓条件复核',
  '更新台账',
  '半年周期提示',
  '自有持仓分析',
  '源哥知识点查询',
];

export default function CommandPanel() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickCommand = (cmd: string) => {
    setInput('');
    sendMessage(cmd);
  };

  const sendMessage = async (msg?: string) => {
    const text = msg || input.trim();
    if (!text || streaming) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setStreaming(true);

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('请求失败');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent };
          return newMessages;
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '⚠️ 请求失败，请稍后重试。' },
        ]);
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 免责声明 */}
      <div className="bg-[#fff7ed] rounded-lg border border-[#fed7aa] px-4 py-2">
        <p className="text-xs text-[#9a3412]">
          ▲ 重要提示: 内容仅为逻辑推演复盘, 不构成任何基金、理财投资建议, 市场有波动, 入市需谨慎
        </p>
      </div>

      {/* 快捷指令栏 */}
      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleQuickCommand(cmd)}
            disabled={streaming}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb] hover:bg-[#6366f1] hover:text-white hover:border-[#6366f1] transition-colors disabled:opacity-50"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* AI助手主内容区 */}
      <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="p-4">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-[#1f2937]">源哥AI基金监控助手已就绪。</p>
              <p className="text-sm font-medium text-[#1f2937]">可用指令：</p>
              <div className="space-y-1.5">
                {INSTRUCTION_LIST.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[#6366f1]/10 text-[#6366f1] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => handleQuickCommand(item)}
                      className="text-sm text-[#4b5563] hover:text-[#6366f1] transition-colors text-left"
                    >
                      {item}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9ca3af] mt-4">
                也可直接输入问题, AI将基于源哥言商知识库进行分析。
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span
                    className={`inline-block px-3 py-2 rounded-lg max-w-[80%] text-left whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#6366f1] text-white'
                        : 'bg-[#f3f4f6] text-[#1f2937]'
                    }`}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}
              {streaming && (
                <div className="text-sm text-[#9ca3af]">AI 正在思考...</div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-[#e5e7eb] px-4 py-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="输入问题或指令..."
            disabled={streaming}
            className="flex-1 px-3 py-2 rounded border border-[#e5e7eb] text-sm focus:outline-none focus:border-[#6366f1] disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={streaming || !input.trim()}
            className="px-4 py-2 rounded text-sm font-medium bg-[#6366f1] text-white hover:bg-[#4f46e5] disabled:opacity-40 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
