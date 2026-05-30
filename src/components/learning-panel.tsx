'use client';

import { useState, useEffect, useCallback } from 'react';
import { CYCLE_THEORIES, IRON_RULES, HISTORY_CASES, DISCLAIMER } from '@/lib/constants';
import type { LearningPeriod, LearningContent, Quiz, LearningProgress } from '@/lib/types';

// 生成学习内容
function generateLearningContent(period: LearningPeriod): LearningContent {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (period === 'morning') {
    const theory = CYCLE_THEORIES[dayIndex % 3];
    return {
      period: 'morning',
      periodName: '早间学习 09:20',
      title: `源哥三大周期理论：${theory.name}`,
      content: `${theory.description}\n\n对AI赛道影响：${theory.impactOnAI}\n\n当前阶段判断：${theory.currentPhase}\n\n周期轮动规律要点：\n1. 每个周期都有明确的启动信号和结束信号\n2. 三大周期叠加时，方向一致的力度最强\n3. 当前${theory.name}处于${theory.currentPhase}，需关注转折信号`,
      keyPoints: [
        `${theory.name}核心定义与轮动规律`,
        `对AI赛道影响权重评估`,
        `当前周期阶段判断方法`,
        `三大周期叠加效应分析`,
      ],
      quizzes: [
        {
          id: 'm1',
          question: `当前${theory.name}处于哪个阶段？`,
          options: ['启动期', theory.currentPhase, '衰退期', '复苏期'],
          correctIndex: 1,
          explanation: `根据源哥周期理论，当前${theory.name}处于${theory.currentPhase}，这是基于多项宏观指标的综合判断。`,
          source: '源哥言商·周期理论',
        },
        {
          id: 'm2',
          question: `${theory.name}对AI赛道的直接影响是什么？`,
          options: ['无影响', theory.impactOnAI.slice(0, 20), '仅影响传统行业', '完全决定走势'],
          correctIndex: 1,
          explanation: theory.impactOnAI,
          source: '源哥言商·周期理论',
        },
        {
          id: 'm3',
          question: '三大周期叠加时，何时力度最强？',
          options: ['方向相反时', '方向一致时', '任一周期启动时', '三个周期都结束时'],
          correctIndex: 1,
          explanation: '源哥周期理论明确指出：三大周期方向叠加一致时，市场力度最强。当前需关注三大周期是否出现方向共振。',
          source: '源哥言商·周期理论',
        },
      ],
      knowledgeLink: '源哥三大经典周期理论',
    };
  }

  if (period === 'noon') {
    const rule = IRON_RULES[dayIndex % IRON_RULES.length];
    return {
      period: 'noon',
      periodName: '午间复习 12:00',
      title: `源哥投资铁律：${rule.title}`,
      content: `${rule.content}\n\n来源：${rule.source}\n\n实战应用场景：\n结合当前持仓分析：\n- 华夏芯片浮盈51.61%：适用"${rule.id === 'r1' ? '不见兔子不撒鹰' : rule.title}"，每次拉升5%-8%分批减仓\n- 平安半导体浮亏10.70%：适用"${rule.id === 'r4' ? '时间止损' : rule.title}"，逼近20%强制停补\n- 核心标的159140/022364：严格按3-3-4法则执行，不追高不梭哈`,
      keyPoints: [
        rule.title,
        rule.content,
        `实战应用：当前持仓如何运用此铁律`,
        `铁律来源：${rule.source}`,
      ],
      quizzes: [
        {
          id: 'n1',
          question: `"${rule.title}"的核心要点是什么？`,
          options: ['随意执行', rule.content.slice(0, 30), '根据感觉操作', '无需遵守'],
          correctIndex: 1,
          explanation: rule.content,
          source: rule.source,
        },
      ],
      knowledgeLink: rule.title,
    };
  }

  // 收盘学习
  const historyCase = HISTORY_CASES[dayIndex % 2];
  return {
    period: 'close',
    periodName: '收盘学习复盘 15:15',
    title: `历史行情对照：${historyCase.name}`,
    content: `${historyCase.description}\n\n回调幅度：${historyCase.callbackRange}\n反弹规律：${historyCase.reboundRule}\n与当前相似度：${historyCase.similarity}\n\n今日学习笔记要点：\n1. ${historyCase.name}的核心特征\n2. 回调后的反弹节奏与力度\n3. 当前行情的异同点\n4. 操作借鉴：当前应如何参考历史制定策略`,
    keyPoints: [
      `${historyCase.name}核心走势特征`,
      `历史回调幅度：${historyCase.callbackRange}`,
      `反弹规律：${historyCase.reboundRule}`,
      `与当前行情相似度评估`,
    ],
    quizzes: [
      {
        id: 'c1',
        question: `${historyCase.name}的回调幅度是多少？`,
        options: ['10%-15%', historyCase.callbackRange, '50%-60%', '5%-10%'],
        correctIndex: 1,
        explanation: `${historyCase.name}期间，回调幅度约为${historyCase.callbackRange}，这是制定当前止损止盈策略的重要参考。`,
        source: '源哥言商·历史行情复盘',
      },
      {
        id: 'c2',
        question: '当前行情与历史的相似度评估？',
        options: ['完全相同', historyCase.similarity, '完全不同', '无法判断'],
        correctIndex: 1,
        explanation: historyCase.similarity,
        source: '源哥言商·历史行情复盘',
      },
    ],
    knowledgeLink: `历史案例：${historyCase.name}`,
  };
}

export function LearningPanel() {
  const [activePeriod, setActivePeriod] = useState<LearningPeriod>('morning');
  const [contents, setContents] = useState<Record<LearningPeriod, LearningContent | null>>({
    morning: null, noon: null, close: null, weekly: null,
  });
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<LearningProgress>({
    date: new Date().toISOString().split('T')[0],
    morningCompleted: false,
    noonCompleted: false,
    closeCompleted: false,
    totalQuizzesCorrect: 0,
    totalQuizzesTaken: 0,
    unlockedContent: [],
  });

  useEffect(() => {
    setContents({
      morning: generateLearningContent('morning'),
      noon: generateLearningContent('noon'),
      close: generateLearningContent('close'),
      weekly: null,
    });
  }, []);

  const handleQuizAnswer = useCallback((quizId: string, selectedIndex: number, correctIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [quizId]: selectedIndex }));
    const isCorrect = selectedIndex === correctIndex;
    setQuizResults((prev) => ({ ...prev, [quizId]: isCorrect }));
    setProgress((prev) => ({
      ...prev,
      totalQuizzesTaken: prev.totalQuizzesTaken + 1,
      totalQuizzesCorrect: prev.totalQuizzesCorrect + (isCorrect ? 1 : 0),
    }));
  }, []);

  const markPeriodComplete = useCallback((period: LearningPeriod) => {
    setProgress((prev) => ({
      ...prev,
      [`${period}Completed`]: true,
    }));
  }, []);

  const currentContent = contents[activePeriod];

  const periods: { id: LearningPeriod; label: string; time: string; completed: boolean }[] = [
    { id: 'morning', label: '早间周期理论', time: '09:20', completed: progress.morningCompleted },
    { id: 'noon', label: '午间铁律复习', time: '12:00', completed: progress.noonCompleted },
    { id: 'close', label: '收盘案例复盘', time: '15:15', completed: progress.closeCompleted },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-amber/90 font-medium">{DISCLAIMER}</p>

      {/* 学习进度概览 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">源哥言商每日学习</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              答题：{progress.totalQuizzesCorrect}/{progress.totalQuizzesTaken}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo/20 text-indigo">
              正确率 {progress.totalQuizzesTaken > 0 ? Math.round(progress.totalQuizzesCorrect / progress.totalQuizzesTaken * 100) : 0}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePeriod(p.id)}
              className={`p-3 rounded border text-left transition-colors ${
                activePeriod === p.id ? 'border-indigo/50 bg-indigo/5' :
                p.completed ? 'border-profit/30 bg-profit/5' :
                'border-border bg-muted/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{p.time}</span>
                {p.completed && <span className="text-profit text-[10px]">✓ 已完成</span>}
              </div>
              <p className="text-xs font-medium text-foreground mt-1">{p.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 学习内容 */}
      {currentContent && (
        <div className="bg-card-bg rounded-lg p-4 border border-indigo/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">{currentContent.title}</h3>
              <span className="text-[10px] text-muted-foreground">{currentContent.periodName}</span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-indigo/20 text-indigo">
              {currentContent.knowledgeLink}
            </span>
          </div>

          {/* 内容正文 */}
          <div className="p-3 rounded bg-muted/20 mb-4">
            <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{currentContent.content}</p>
          </div>

          {/* 必掌握要点 */}
          <div className="mb-4">
            <h4 className="text-[10px] text-amber font-medium mb-2 uppercase tracking-wider">必掌握要点</h4>
            <div className="space-y-1">
              {currentContent.keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-amber shrink-0 mt-0.5">▸</span>
                  <span className="text-xs text-foreground/80">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 学习检验 */}
          {currentContent.quizzes && currentContent.quizzes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] text-amber font-medium mb-2 uppercase tracking-wider">学习检验</h4>
              <div className="space-y-3">
                {currentContent.quizzes.map((quiz) => {
                  const answered = quizAnswers[quiz.id] !== undefined;
                  const isCorrect = quizResults[quiz.id];
                  return (
                    <div key={quiz.id} className={`p-3 rounded border ${
                      answered ? (isCorrect ? 'border-profit/50 bg-profit/5' : 'border-loss/50 bg-loss/5 shake') : 'border-border bg-muted/10'
                    }`}>
                      <p className="text-xs text-foreground mb-2">{quiz.question}</p>
                      <div className="space-y-1">
                        {quiz.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => !answered && handleQuizAnswer(quiz.id, oi, quiz.correctIndex)}
                            disabled={answered}
                            className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                              answered && oi === quiz.correctIndex ? 'bg-profit/20 text-profit' :
                              answered && oi === quizAnswers[quiz.id] && !isCorrect ? 'bg-loss/20 text-loss' :
                              'bg-muted/30 text-foreground/70 hover:bg-muted/50'
                            }`}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </button>
                        ))}
                      </div>
                      {answered && (
                        <div className={`mt-2 p-2 rounded text-[10px] ${isCorrect ? 'text-profit' : 'text-loss'}`}>
                          {isCorrect ? '✓ 回答正确' : '✗ 回答错误'}
                          <p className="text-muted-foreground mt-1">{quiz.explanation}</p>
                          {quiz.source && <p className="text-indigo mt-0.5">来源：{quiz.source}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 完成按钮 */}
          <button
            onClick={() => markPeriodComplete(activePeriod)}
            className={`w-full py-2 text-xs rounded transition-colors ${
              progress[`${activePeriod}Completed` as keyof LearningProgress]
                ? 'bg-profit/20 text-profit'
                : 'bg-indigo text-indigo-foreground hover:bg-indigo/90'
            }`}
          >
            {progress[`${activePeriod}Completed` as keyof LearningProgress] ? '✓ 已标记完成' : '标记本时段学习完成'}
          </button>
        </div>
      )}

      {/* 完整铁律清单 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">源哥投资铁律完整清单（半年循环）</h3>
        <div className="space-y-2">
          {IRON_RULES.map((rule, i) => (
            <div key={rule.id} className={`p-3 rounded border ${
              i === (new Date().getDay() - 1) % 7 ? 'border-amber/40 bg-amber/5' : 'border-border bg-muted/10'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{i + 1}. {rule.title}</span>
                {i === (new Date().getDay() - 1) % 7 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber/20 text-amber">今日复习</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{rule.content}</p>
              <p className="text-[9px] text-indigo mt-1">{rule.source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 历史行情案例库 */}
      <div className="bg-card-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">历史行情案例库</h3>
        <div className="grid grid-cols-2 gap-3">
          {HISTORY_CASES.map((hc) => (
            <div key={hc.id} className="p-3 rounded border border-border bg-muted/10">
              <p className="text-xs font-medium text-foreground mb-2">{hc.name}</p>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <p>{hc.description}</p>
                <p>回调幅度：<span className="text-amber font-mono">{hc.callbackRange}</span></p>
                <p>反弹规律：<span className="text-profit">{hc.reboundRule}</span></p>
                <p>与当前相似度：<span className="text-indigo">{hc.similarity}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
