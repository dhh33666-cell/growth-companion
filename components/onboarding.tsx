"use client";

import { Check, ChevronRight, Dumbbell, Sparkles, Target } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "@/lib/types";

export function Onboarding({
  data,
  onComplete,
}: {
  data: AppData;
  onComplete: (next: AppData) => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.userName === "探索者" ? "" : data.userName);
  const [goal, setGoal] = useState(data.goal);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState("3");

  const complete = (event: FormEvent) => {
    event.preventDefault();
    onComplete({
      ...data,
      onboarded: true,
      userName: name.trim() || "探索者",
      goal: goal.trim() || "建立稳定、可持续的成长系统",
      memory: [
        ...data.memory,
        `已完成首次设置：每周计划训练 ${workoutsPerWeek} 次，当前长期目标是「${goal.trim() || "建立稳定、可持续的成长系统"}」。`,
      ],
    });
  };

  return (
    <div className="onboarding-backdrop">
      <form className="onboarding-card" onSubmit={complete}>
        <div className="onboarding-top">
          <div className="brand-orbit">✦</div>
          <div>
            <div className="eyebrow">FIRST QUEST</div>
            <h2>建立你的成长系统</h2>
          </div>
        </div>
        <div className="onboarding-steps">
          {["身份", "主线", "节奏"].map((label, index) => (
            <span key={label} className={index === step ? "current" : index < step ? "complete" : ""}>
              {index < step ? <Check size={12} /> : index + 1} {label}
            </span>
          ))}
        </div>
        {step === 0 && (
          <div className="onboarding-body">
            <Target size={26} color="#54D6FF" />
            <h3>先定义你要去哪里</h3>
            <p>成长不是堆任务。写下你希望 AI 长期帮你推进的真实目标。</p>
            <label className="field"><span>你的昵称</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：邓同学" autoFocus /></label>
            <label className="field"><span>未来 6-12 个月的目标</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="例如：2027 年寒假前拿到数据分析相关实习" /></label>
          </div>
        )}
        {step === 1 && (
          <div className="onboarding-body">
            <Sparkles size={26} color="#F6B64A" />
            <h3>你的默认学习主线</h3>
            <p>已为你创建数据分析、AI 学习、英语学习三条主线。以后可在计划世界继续添加课程和项目。</p>
            <div className="onboarding-track"><span>01</span><div><b>数据分析</b><small>课程、案例、Ozon 经营分析</small></div></div>
            <div className="onboarding-track"><span>02</span><div><b>AI 学习</b><small>工具实践、Vibe Coding、产品原型</small></div></div>
            <div className="onboarding-track"><span>03</span><div><b>英语学习</b><small>听力、表达和输入习惯</small></div></div>
          </div>
        )}
        {step === 2 && (
          <div className="onboarding-body">
            <Dumbbell size={26} color="#79DD9B" />
            <h3>设定可持续的节奏</h3>
            <p>系统会将学习与健康/日常主任务共同视为“达标日”，连续 3 天可获得一次抽奖资格。</p>
            <label className="field"><span>每周计划训练次数</span><select value={workoutsPerWeek} onChange={(event) => setWorkoutsPerWeek(event.target.value)}><option value="2">2 次</option><option value="3">3 次</option><option value="4">4 次</option><option value="5">5 次</option></select></label>
            <div className="onboarding-note">不完成不会扣属性。系统会在晚间复盘中帮助你降低难度、延期或重排任务。</div>
          </div>
        )}
        <div className="onboarding-actions">
          {step > 0 ? <button className="btn" type="button" onClick={() => setStep(step - 1)}>返回</button> : <span />}
          {step < 2 ? <button className="btn primary" type="button" onClick={() => setStep(step + 1)}>下一步 <ChevronRight size={15} /></button> : <button className="btn primary" type="submit">进入任务世界 <ChevronRight size={15} /></button>}
        </div>
      </form>
    </div>
  );
}
