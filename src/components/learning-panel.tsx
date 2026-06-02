'use client';

import { useState, useEffect } from 'react';

export default function LearningPanel() {
  const [activeTest, setActiveTest] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 今日学习主题
  const todayTopic = '源哥三大周期理论 · 当日应用';

  // 测试题
  const testQuestions = [
    {
      question: '源哥三大周期中，当前对AI赛道影响权重最大的是？',
      options: [
        'A. 美联储加息周期',
        'B. AI科技主线周期',
        'C. 大宗商品/油价周期',
      ],
      correct: 1,
      explanation: 'AI科技主线周期直接决定赛道走势，当前处于上升周期，算力与应用端持续受益。',
    },
    {
      question: '3-3-4分批建仓法的核心目的是？',
      options: [
        'A. 追求最大收益',
        'B. 杜绝一次性满仓',
        'C. 减少交易手续费',
      ],
      correct: 1,
      explanation: '分批建仓的核心是控制风险，避免在单一时点全部投入，3-3-4的比例确保有充足弹药应对后续波动。',
    },
    {
      question: '2026年11月的时间止损铁律要求？',
      options: [
        'A. AI仓位加至60%',
        'B. AI仓位压至20%以下',
        'C. 全部清仓不保留',
      ],
      correct: 1,
      explanation: '11月未创新高，AI仓位压至20%以下，非AI赛道全部清仓，资金归集等待下一轮周期。',
    },
  ];

  // 知识干货
  const cycleKnowledge = [
    { name: 'AI科技主线周期', desc: '大模型训练→算力扩张→应用落地，当前处于算力向应用传导阶段' },
    { name: '美联储加息周期', desc: '降息预期延后至9月，关注议息会议措辞变化对成长股估值影响' },
    { name: '大宗商品/油价周期', desc: '油价中枢下移至70-80区间，通胀压力暂缓，有利于货币政策空间' },
  ];

  const ironRules = [
    '不见兔子不撒鹰 · 严格按触发条件执行',
    '分批建仓3-3-4 · 杜绝一次性满仓',
    '追高是亏损根源 · 严守净值红线',
    '时间止损比价格止损更重要 · 11月节点',
    '卖的5大层次 · 从卖情绪到卖规则',
    '人生九段论与财富积累的对应关系',
    '流动性资产的核心价值 · 现金守恒定律',
  ];

  // 学习进度
  const progressItems = [
    { label: '常规复习', progress: 65 },
    { label: '本周复习', progress: 40 },
    { label: '半年复习', progress: 15 },
    { label: '收盘复盘', progress: 0 },
  ];

  const handleAnswer = (questionIdx: number, answerIdx: number) => {
    setActiveTest(questionIdx);
    setSelectedAnswer(answerIdx);
    setShowResult(true);
  };

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* 左侧：学习测试区 */}
      <div className="col-span-3 space-y-4">
        {/* 今日主题 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">
              今日学习主题
            </h3>
          </div>
          <div className="p-4">
            <div className="p-3 rounded-lg bg-[#6366f1]/5 border border-[#6366f1]/20">
              <p className="text-sm font-medium text-[#6366f1]">
                {todayTopic}
              </p>
              <p className="text-xs text-[#6b7280] mt-1">
                关联基金操作：周期轮动决定建仓节奏，当前布局期耐心等待黄金坑信号
              </p>
            </div>
          </div>
        </div>

        {/* 学习测试 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">
              学习检验 · 3题
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {testQuestions.map((q, qi) => (
              <div key={qi} className="space-y-2">
                <p className="text-sm font-medium text-[#1f2937]">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const isSelected = activeTest === qi && selectedAnswer === oi;
                    const isCorrect = oi === q.correct;
                    const showFeedback = activeTest === qi && showResult;

                    return (
                      <button
                        key={oi}
                        onClick={() => handleAnswer(qi, oi)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                          showFeedback && isCorrect
                            ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981]'
                            : showFeedback && isSelected && !isCorrect
                            ? 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444]'
                            : 'bg-[#f9fafb] border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {activeTest === qi && showResult && (
                  <p
                    className={`text-xs p-2 rounded ${
                      selectedAnswer === q.correct
                        ? 'bg-[#10b981]/5 text-[#10b981]'
                        : 'bg-[#ef4444]/5 text-[#ef4444]'
                    }`}
                  >
                    {selectedAnswer === q.correct ? '✓ 正确！' : '✗ 错误。'}
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：知识干货区 */}
      <div className="col-span-2 space-y-4">
        {/* 三大周期 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">三大周期</h3>
          </div>
          <div className="p-4 space-y-2.5">
            {cycleKnowledge.map((item, i) => (
              <div key={i} className="p-2.5 rounded bg-[#f9fafb] border border-[#e5e7eb]">
                <p className="text-xs font-medium text-[#6366f1]">
                  {item.name}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 投资铁律清单 */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
            <h3 className="text-sm font-bold text-[#1f2937]">投资铁律清单</h3>
          </div>
          <div className="p-4 space-y-1.5">
            {ironRules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                <span className="text-[#374151]">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：学习进度 */}
      <div className="col-span-5 bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#e5e7eb]">
          <h3 className="text-sm font-bold text-[#1f2937]">学习进度追踪</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-4 gap-4">
            {progressItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#6b7280]">{item.label}</span>
                  <span className="text-xs font-mono text-[#6b7280]">
                    {item.progress}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6366f1] rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
