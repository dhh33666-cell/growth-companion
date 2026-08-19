"use client";

import {
  Activity, AlertTriangle, ArrowUpRight, Award, BarChart3, Brain, CalendarDays, Check, ChevronRight, CircleHelp,
  Dumbbell, Flame, Gift, HeartPulse, LayoutDashboard, Lightbulb, ListChecks, MessageSquare, Plus, Search, Settings,
  Pencil, Sparkles, Target, Trash2, Trophy, Utensils, WalletCards,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Onboarding } from "@/components/onboarding";
import { loadCloudData, syncCloudData } from "@/lib/cloud";
import { attributeMeta, createDefaultRewards, createInitialData, dayOffset, DEFAULT_GAIN_CATEGORIES, hydrateData, isDailyQualified, levelFromXp, refundTaskPenalty, settleMissedTasks, taskReward, today, weeklyRewardSpend } from "@/lib/game";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { AppData, AppView, AttributeKey, GainEntry, HabitLog, MealLog, Reward, Task, TaskCategory, WorkoutLog } from "@/lib/types";

const STORAGE_KEY = "growth-companion-v1";
const navItems: { id: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "今日任务", icon: LayoutDashboard },
  { id: "plan", label: "计划世界", icon: ListChecks },
  { id: "record", label: "生活记录", icon: Activity },
  { id: "gains", label: "每日收获", icon: Lightbulb },
  { id: "growth", label: "成长档案", icon: BarChart3 },
  { id: "rewards", label: "奖励仓库", icon: Gift },
  { id: "coach", label: "AI 教练", icon: MessageSquare },
  { id: "settings", label: "设置", icon: Settings },
];

const labels: Record<TaskCategory, string> = { learning: "数据分析", ai: "AI 实操", english: "英语", workout: "训练", habit: "习惯", social: "社交", rest: "休息" };

function persist(data: AppData) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
const supabaseClient = getSupabaseBrowserClient();

export function GrowthApp({ initialView }: { initialView: AppView }) {
  const [data, setData] = useState<AppData>(() => createInitialData());
  const [view, setView] = useState<AppView>(initialView);
  const [toast, setToast] = useState("");
  const [mounted, setMounted] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabaseClient));
  const [cloudReady, setCloudReady] = useState(!supabaseClient);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setData(hydrateData(JSON.parse(saved)));
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!supabaseClient) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) {
        setAuthUser(null);
        setAuthLoading(false);
      }
    }, 8000);
    supabaseClient.auth.getUser().then(({ data: result }) => {
      if (!active) return;
      setAuthUser(result.user ? { id: result.user.id } : null);
      setAuthLoading(false);
      window.clearTimeout(timeout);
    }).catch(() => {
      if (!active) return;
      setAuthUser(null);
      setAuthLoading(false);
      window.clearTimeout(timeout);
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? { id: session.user.id } : null);
      setAuthLoading(false);
      window.clearTimeout(timeout);
    });
    return () => { active = false; window.clearTimeout(timeout); listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!mounted || !supabaseClient || !authUser) {
      if (mounted && !authUser) setCloudReady(true);
      return;
    }
    let active = true;
    loadCloudData(supabaseClient, authUser.id).then((remote) => {
      if (!active) return;
      if (remote) setData(hydrateData(remote));
      else void syncCloudData(supabaseClient, authUser.id, data);
      setCloudReady(true);
    }).catch(() => {
      if (active) { setCloudReady(true); notify("云端读取失败，暂时使用本地数据"); }
    });
    return () => { active = false; };
  // The first authenticated load should run once per user; later sync is handled below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, authUser?.id]);
  useEffect(() => { if (mounted) persist(data); }, [data, mounted]);
  useEffect(() => {
    if (!mounted || !cloudReady || !supabaseClient || !authUser) return;
    const timer = window.setTimeout(() => {
      void syncCloudData(supabaseClient, authUser.id, data).catch(() => notify("本地已保存，云端同步稍后重试"));
    }, 700);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, cloudReady, authUser?.id, mounted]);
  useEffect(() => {
    if (!mounted || !cloudReady) return;
    if (supabaseClient && !authUser) return;
    const result = settleMissedTasks(data);
    if (result.settledCount > 0) {
      setData(result.data);
      notify(`昨日有 ${result.settledCount} 个任务未完成：经验 -${result.xpPenalty}，属性 -${result.attributePenalty}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mounted, cloudReady, authUser?.id]);
  useEffect(() => {
    const message = (event: PopStateEvent) => setView((window.location.pathname.slice(1) as AppView) || "home");
    window.addEventListener("popstate", message);
    return () => window.removeEventListener("popstate", message);
  }, []);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const navigate = (next: AppView) => {
    setView(next);
    window.history.pushState({}, "", next === "home" ? "/" : `/${next}`);
  };
  const update = (next: AppData, message?: string) => { setData(next); if (message) notify(message); };

  if (!mounted || (supabaseClient && authLoading)) return <div className="loading-screen">正在连接成长系统...</div>;
  if (supabaseClient && !authUser) return <AuthScreen client={supabaseClient} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <div className="brand-orbit">✦</div>
          <div><div className="brand-title">成长秘书</div><div className="brand-subtitle">REAL LIFE RPG / v0.1</div></div>
        </div>
        <div className="nav-label">Mission control</div>
        <nav className="nav-list">
          {navItems.map(({ id, label, icon: Icon }) => (
            <Link key={id} href={id === "home" ? "/" : `/${id}`} className={`nav-link ${view === id ? "active" : ""}`} onClick={(event) => { event.preventDefault(); navigate(id); }}>
              <Icon size={16} />{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">你的现实生活正在生成经验值。<br />保持诚实，保持可持续。</div>
      </aside>
      <main className="main">
        <Topbar view={view} data={data} />
        {view === "home" && <HomeView data={data} update={update} navigate={navigate} />}
        {view === "plan" && <PlanView data={data} update={update} />}
        {view === "record" && <RecordView data={data} update={update} />}
        {view === "gains" && <GainsView data={data} update={update} />}
        {view === "growth" && <GrowthView data={data} />}
        {view === "rewards" && <RewardsView data={data} update={update} />}
        {view === "coach" && <CoachView data={data} update={update} />}
        {view === "settings" && <SettingsView data={data} update={update} onSignOut={supabaseClient ? () => void supabaseClient.auth.signOut() : undefined} />}
      </main>
      {mounted && !data.onboarded && <Onboarding data={data} onComplete={(next) => update(next, "成长系统已初始化")} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Topbar({ view, data }: { view: AppView; data: AppData }) {
  const titles: Record<AppView, [string, string]> = {
    home: ["Good morning, explorer.", "今天不追求完美，只完成下一步。"],
    plan: ["计划世界", "把长期目标拆成今天可完成的任务。"],
    record: ["生活记录", "训练、饮食和日常行为都值得被看见。"],
    gains: ["每日收获", "记录新名词与概念，让每一次输入都留痕。"],
    growth: ["成长档案", "观察你正在变成谁，而不只是完成了什么。"],
    rewards: ["奖励仓库", "把奖励真正放回现实生活。"],
    coach: ["AI 理性教练", "基于你的记录，给出下一步。"],
    settings: ["系统设置", "调整你的成长规则与数据边界。"],
  };
  return <header className="topbar"><div><div className="eyebrow">LEVEL {levelFromXp(data.totalXp).level} / MISSION CONTROL</div><h1>{titles[view][0]}</h1><p className="topbar-copy">{titles[view][1]}</p></div><div className="date-chip"><CalendarDays size={14} /> {today()} · {data.userName}</div></header>;
}

function HomeView({ data, update, navigate }: { data: AppData; update: (d: AppData, m?: string) => void; navigate: (v: AppView) => void }) {
  const level = levelFromXp(data.totalXp);
  const completed = data.tasks.filter((t) => t.date === today() && t.completed).length;
  const total = data.tasks.filter((t) => t.date === today()).length;
  const qualified = isDailyQualified(data);
  return <>
    <div className="hero-grid">
      <section className="panel hero-panel">
        <div className="hero-kicker">TODAY&apos;S OPERATING SYSTEM</div>
        <div className="hero-copy">你正在把 <strong>数据分析、AI、英语与身体训练</strong> 变成一套可持续的成长系统。</div>
        <div className="hero-meta"><div><span className="metric-value">{completed}/{total}</span><span className="metric-label">今日任务</span></div><div><span className="metric-value">{data.streak}<span style={{ color: "#F6B64A", fontSize: 16 }}> DAYS</span></span><span className="metric-label">当前连胜</span></div><div><span className="metric-value">{data.totalXp}</span><span className="metric-label">总经验</span></div></div>
      </section>
      <section className="panel level-panel">
        <div className="level-row"><div><div className="eyebrow">CURRENT RANK</div><div className="level-number">{level.level}</div><div className="level-caption">探索者 · 第 {level.level} 级</div></div><Trophy size={30} color="#F6B64A" /></div>
        <div className="progress-line"><div className="progress"><span style={{ width: `${(level.current / level.needed) * 100}%` }} /></div><div className="progress-note"><span>{level.current} XP</span><span>{level.needed} XP to next</span></div></div>
      </section>
    </div>
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-header"><div className="panel-title"><Target size={18} /><div><h2>今日任务</h2><div className="subtle">早上确认，晚上复盘。先完成一个最小动作。</div></div></div><button className="btn ghost" onClick={() => navigate("plan")}>管理计划 <ChevronRight size={14} /></button></div>
      <TaskList data={data} update={update} limit={5} />
    </section>
    <div className="section-grid">
      <section className="panel">
        <div className="panel-header"><div className="panel-title"><Sparkles size={18} /><div><h2>属性状态</h2><div className="subtle">每个真实动作，都会留下成长痕迹。</div></div></div><button className="btn ghost" onClick={() => navigate("growth")}>查看档案 <ArrowUpRight size={14} /></button></div>
        <AttributeGrid data={data} />
      </section>
      <section className="panel">
        <div className="panel-header"><div className="panel-title"><Gift size={18} /><div><h2>奖励资格</h2><div className="subtle">连续 3 个达标日可抽取一次。</div></div></div></div>
        <div className="panel-pad"><div className="stat-row"><div><span className="metric-value" style={{ color: qualified ? "#79DD9B" : "#F6B64A" }}>{qualified ? "READY" : `${data.streak}/3`}</span><span className="metric-label">{qualified ? "今日已达标，可进入抽奖" : "连续达标进度"}</span></div><Flame size={26} color={qualified ? "#79DD9B" : "#F6B64A"} /></div><div style={{ marginTop: 20 }} className="button-row"><button className="btn primary" onClick={() => navigate("rewards")}>打开奖励仓库</button></div></div>
      </section>
    </div>
    <div className="quest-banner"><div><div className="quest-title">本周主线：建立你的数据分析作品集</div><div className="quest-copy">完成数据诊断复盘，并把 Ozon 运营台账更新到最新。</div></div><button className="btn" onClick={() => navigate("coach")}><MessageSquare size={15} /> 找教练拆解</button></div>
  </>;
}

function TaskList({ data, update, limit }: { data: AppData; update: (d: AppData, m?: string) => void; limit?: number }) {
  const tasks = data.tasks.filter((task) => task.date === today()).slice(0, limit);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<TaskCategory>("learning");
  const [editMinutes, setEditMinutes] = useState("30");
  const [editIsMain, setEditIsMain] = useState(false);
  const toggle = (task: Task) => {
    const reward = taskReward({ ...task, actualMinutes: task.actualMinutes || task.plannedMinutes });
    const next = { ...data, totalXp: data.totalXp, stats: { ...data.stats } };
    if (task.completed) {
      next.totalXp = Math.max(0, next.totalXp - (task.xpAwarded ?? reward.xp));
      (Object.entries(reward.stats) as [AttributeKey, number][]).forEach(([key, value]) => { next.stats[key] = Math.max(0, next.stats[key] - value); });
      next.tasks = data.tasks.map((item) => item.id === task.id ? { ...item, completed: false, xpAwarded: undefined } : item);
      update(next, `已恢复「${task.title}」为未完成`);
      return;
    }
    next.totalXp += reward.xp;
    (Object.entries(reward.stats) as [AttributeKey, number][]).forEach(([key, value]) => { next.stats[key] += value; });
    next.tasks = data.tasks.map((item) => item.id === task.id ? { ...item, completed: true, actualMinutes: item.actualMinutes || item.plannedMinutes, xpAwarded: reward.xp } : item);
    update(next, `任务完成 +${reward.xp} XP`);
  };
  const remove = (task: Task) => {
    if (!window.confirm(`确定删除「${task.title}」吗？`)) return;
    let next = { ...data, tasks: data.tasks.filter((item) => item.id !== task.id), stats: { ...data.stats } };
    if (task.completed) {
      const reward = taskReward({ ...task, actualMinutes: task.actualMinutes || task.plannedMinutes });
      next.totalXp = Math.max(0, data.totalXp - (task.xpAwarded ?? reward.xp));
      (Object.entries(reward.stats) as [AttributeKey, number][]).forEach(([key, value]) => { next.stats[key] = Math.max(0, next.stats[key] - value); });
    }
    update(next, "任务已删除");
  };
  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditCategory(task.category);
    setEditMinutes(String(task.plannedMinutes));
    setEditIsMain(task.isMain);
  };
  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingId || !editTitle.trim()) return;
    const current = data.tasks.find((task) => task.id === editingId);
    if (!current) return;
    const edited: Task = {
      ...current,
      title: editTitle.trim(),
      category: editCategory,
      plannedMinutes: Math.max(5, Number(editMinutes) || 30),
      isMain: editIsMain,
      track: labels[editCategory],
    };
    const next = { ...data, tasks: data.tasks.map((task) => task.id === editingId ? edited : task), stats: { ...data.stats } };
    if (current.completed) {
      const oldReward = taskReward(current);
      const newReward = taskReward(edited);
      next.totalXp = Math.max(0, data.totalXp - oldReward.xp + newReward.xp);
      (Object.keys(next.stats) as AttributeKey[]).forEach((key) => {
        next.stats[key] = Math.max(0, data.stats[key] - (oldReward.stats[key] ?? 0) + (newReward.stats[key] ?? 0));
      });
      next.tasks = next.tasks.map((task) => task.id === editingId ? { ...task, xpAwarded: newReward.xp } : task);
    }
    update(next, "任务已更新");
    setEditingId(null);
  };
  return <div className="task-list">{tasks.length ? tasks.map((task) => editingId === task.id ? <form className="task-edit-row" key={task.id} onSubmit={saveEdit}>
    <div className="task-edit-main"><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} aria-label="任务名称" autoFocus /><div className="task-edit-fields"><select value={editCategory} onChange={(event) => setEditCategory(event.target.value as TaskCategory)} aria-label="任务类别">{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><input type="number" min="5" max="480" value={editMinutes} onChange={(event) => setEditMinutes(event.target.value)} aria-label="预计分钟" /><label className="check-field"><input type="checkbox" checked={editIsMain} onChange={(event) => setEditIsMain(event.target.checked)} />主任务</label></div></div>
    <div className="task-actions"><button className="btn ghost" type="submit" title="保存编辑"><Check size={14} /></button><button className="btn ghost" type="button" onClick={() => setEditingId(null)} title="取消编辑">×</button></div>
  </form> : <div className="task-row" key={task.id}><button className={`task-check ${task.completed ? "done" : ""}`} onClick={() => toggle(task)} aria-label={`${task.completed ? "恢复" : "完成"} ${task.title}`}>{task.completed && <Check size={15} />}</button><div className="task-main"><div className={`task-title ${task.completed ? "done" : ""}`}>{task.title}</div><div className="task-info"><span className={`tag ${task.category === "workout" ? "green" : task.category === "ai" ? "warm" : ""}`}>{labels[task.category]}</span>{task.isMain && <span className="tag warm">主任务</span>}<span className="tiny">{task.plannedMinutes} min</span></div></div><div className="task-actions"><div className="task-xp">{task.completed ? `+${task.xpAwarded ?? 0} XP` : "+ XP"}</div><button className="btn ghost task-edit" onClick={() => startEdit(task)} aria-label={`编辑 ${task.title}`} title="编辑任务"><Pencil size={14} /></button><button className="btn ghost task-delete" onClick={() => remove(task)} aria-label={`删除 ${task.title}`} title="删除任务"><Trash2 size={14} /></button></div></div>) : <div className="empty">今天还没有任务，去计划世界创建一个。</div>}</div>;
}

function AttributeGrid({ data }: { data: AppData }) {
  return <div className="attribute-grid">{(Object.entries(data.stats) as [AttributeKey, number][]).map(([key, value]) => <div className="attribute" key={key} style={{ color: attributeMeta[key].color }}><div className="attribute-circle">{value}</div><div className="attribute-name">{attributeMeta[key].label}</div><div className="attribute-score mono">{attributeMeta[key].short}</div></div>)}</div>;
}

function PlanView({ data, update }: { data: AppData; update: (d: AppData, m?: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("learning");
  const [minutes, setMinutes] = useState("30");
  const [isMain, setIsMain] = useState(false);
  const addTask = (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; update({ ...data, tasks: [...data.tasks, { id: crypto.randomUUID(), title: title.trim(), category, date: today(), plannedMinutes: Number(minutes), isMain, completed: false, track: labels[category] }] }, "任务已加入今日计划"); setTitle(""); setShowForm(false); };
  return <><div className="section-grid"><section className="panel"><div className="panel-header"><div className="panel-title"><ListChecks size={18} /><div><h2>今日任务编排</h2><div className="subtle">学习主线与身体状态都要有位置。</div></div></div><button className="btn primary" onClick={() => setShowForm(!showForm)}><Plus size={15} /> 新任务</button></div>{showForm && <form className="form-grid" onSubmit={addTask}><div className="field full"><label>任务名称</label><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：完成一个数据诊断案例" /></div><div className="field"><label>任务类别</label><select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="field"><label>预计分钟</label><input type="number" min="5" max="480" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div><label className="check-field"><input type="checkbox" checked={isMain} onChange={(e) => setIsMain(e.target.checked)} />设为今日主任务</label><div className="button-row full"><button className="btn primary" type="submit">加入计划</button><button className="btn" type="button" onClick={() => setShowForm(false)}>取消</button></div></form>}<TaskList data={data} update={update} /></section><section className="panel"><div className="panel-header"><div className="panel-title"><Brain size={18} /><div><h2>三条学习主线</h2><div className="subtle">从课程到实操，保持可见的进度。</div></div></div></div><div className="panel-pad">{["数据分析", "AI 学习", "英语学习"].map((track, index) => <div className="stat-row" key={track} style={{ padding: "14px 0", borderBottom: index === 2 ? 0 : "1px solid var(--line)" }}><div><div style={{ fontSize: 13 }}>{track}</div><div className="tiny" style={{ marginTop: 5 }}>{index === 0 ? "数据诊断 · 指标体系" : index === 1 ? "AI 工具 · Vibe Coding" : "听力 · 表达"}</div></div><span className="tag">{index === 0 ? "进行中" : "准备中"}</span></div>)}</div></section></div><OverduePanel data={data} update={update} /></>;
}

function OverduePanel({ data, update }: { data: AppData; update: (d: AppData, m?: string) => void }) {
  const overdue = data.tasks.filter((task) => !task.completed && task.date < today());
  if (!overdue.length) return null;
  const completeLate = (task: Task) => update({ ...data, tasks: data.tasks.map((item) => item.id === task.id ? { ...item, completed: true } : item) }, `已标记完成「${task.title}」（逾期不计经验）`);
  const defer = (task: Task) => {
    const base = refundTaskPenalty(data, task.id);
    update({ ...base, tasks: base.tasks.map((item) => item.id === task.id ? { ...item, date: dayOffset(1), penalized: false, penaltyXp: undefined, penaltyStats: undefined } : item) }, `已延期「${task.title}」，扣除数值已退回`);
  };
  const remove = (task: Task) => {
    if (!window.confirm(`确定删除逾期任务「${task.title}」吗？`)) return;
    const base = refundTaskPenalty(data, task.id);
    update({ ...base, tasks: base.tasks.filter((item) => item.id !== task.id) }, `已删除「${task.title}」，扣除数值已退回`);
  };
  return <section className="panel" style={{ marginTop: 16 }}><div className="panel-header"><div className="panel-title"><AlertTriangle size={18} color="#F6B64A" /><div><h2>逾期未完成</h2><div className="subtle">删除或延期可退回已扣除的数值；标记完成不会补发经验。</div></div></div></div><div className="task-list">{overdue.map((task) => <div className="task-row" key={task.id}><div className="task-main"><div className="task-title">{task.title}</div><div className="task-info"><span className={`tag ${task.category === "workout" ? "green" : task.category === "ai" ? "warm" : ""}`}>{labels[task.category]}</span><span className="tiny">{task.date}</span>{task.penalized && <span className="tag warm">已扣 -{task.penaltyXp ?? 0} XP</span>}</div></div><div className="task-actions"><button className="btn ghost" onClick={() => completeLate(task)}>完成</button><button className="btn ghost" onClick={() => defer(task)}>延期</button><button className="btn ghost task-delete" onClick={() => remove(task)} title="删除逾期任务"><Trash2 size={14} /></button></div></div>)}</div></section>;
}

function RecordView({ data, update }: { data: AppData; update: (d: AppData, m?: string) => void }) {
  const [tab, setTab] = useState<"workout" | "meal" | "habit">("workout");
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [state, setState] = useState<WorkoutLog["state"]>("正常");
  const [meal, setMeal] = useState<MealLog["meal"]>("早餐");
  const [health, setHealth] = useState<MealLog["health"]>("均衡");
  const [habit, setHabit] = useState<HabitLog["category"]>("睡眠");
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    if (tab === "workout") update({ ...data, workouts: [...data.workouts, { id: crypto.randomUUID(), date: today(), movements: [{ name: text.trim(), minutes: Number(minutes) }], state, notes: "" }] }, "训练记录已保存");
    if (tab === "meal") update({ ...data, meals: [...data.meals, { id: crypto.randomUUID(), date: today(), meal, content: text.trim(), health, isReward: health === "放纵" }] }, "饮食记录已保存");
    if (tab === "habit") update({ ...data, habits: [...data.habits, { id: crypto.randomUUID(), date: today(), category: habit, minutes: Number(minutes), completed: true, note: text.trim() }] }, "日常记录已保存");
    setText("");
  };
  const removeLog = (kind: "workouts" | "meals" | "habits", id: string) => {
    if (!window.confirm("确定删除这条记录吗？")) return;
    update({ ...data, [kind]: data[kind].filter((entry) => entry.id !== id) }, "记录已删除");
  };
  const hasRecords = data.workouts.some((x) => x.date === today()) || data.meals.some((x) => x.date === today()) || data.habits.some((x) => x.date === today());
  return <div className="section-grid">
    <section className="panel">
      <div className="panel-header"><div className="panel-title"><Activity size={18} /><div><h2>快速记录</h2><div className="subtle">不追求精确到克，先让行为变得可见。</div></div></div></div>
      <div className="tab-row">
        <button className={`tab ${tab === "workout" ? "active" : ""}`} onClick={() => setTab("workout")}><Dumbbell size={12} /> 训练</button>
        <button className={`tab ${tab === "meal" ? "active" : ""}`} onClick={() => setTab("meal")}><Utensils size={12} /> 饮食</button>
        <button className={`tab ${tab === "habit" ? "active" : ""}`} onClick={() => setTab("habit")}><HeartPulse size={12} /> 日常</button>
      </div>
      <form className="form-grid" onSubmit={save}>
        <div className="field full"><label>{tab === "workout" ? "动作名称" : tab === "meal" ? "吃了什么" : "今天做了什么"}</label><input value={text} onChange={(e) => setText(e.target.value)} placeholder={tab === "workout" ? "例如：快走、俯卧撑、拉伸" : tab === "meal" ? "例如：鸡蛋、米饭、青菜" : "例如：睡眠 7 小时，状态不错"} /></div>
        <div className="field"><label>{tab === "meal" ? "餐次" : tab === "habit" ? "行为类别" : "时长（分钟）"}</label>{tab === "meal" ? <select value={meal} onChange={(e) => setMeal(e.target.value as MealLog["meal"])}>{["早餐", "午餐", "晚餐", "加餐"].map((x) => <option key={x}>{x}</option>)}</select> : tab === "habit" ? <select value={habit} onChange={(e) => setHabit(e.target.value as HabitLog["category"])}>{["睡眠", "作息/饮水", "阅读/整理", "社交", "休息娱乐"].map((x) => <option key={x}>{x}</option>)}</select> : <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />}</div>
        {tab === "workout" && <div className="field"><label>训练状态</label><select value={state} onChange={(e) => setState(e.target.value as WorkoutLog["state"])}>{["精力充足", "正常", "疲劳", "明显不适"].map((x) => <option key={x}>{x}</option>)}</select></div>}
        {tab === "meal" && <div className="field"><label>健康程度</label><select value={health} onChange={(e) => setHealth(e.target.value as MealLog["health"])}>{["均衡", "一般", "放纵"].map((x) => <option key={x}>{x}</option>)}</select></div>}
        <div className="button-row full"><button className="btn primary" type="submit"><Plus size={15} /> 保存记录</button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-header"><div className="panel-title"><CalendarDays size={18} /><div><h2>今日轨迹</h2><div className="subtle">晚上复盘时，AI 会读取这里。</div></div></div></div>
      <div className="panel-pad">
        {data.workouts.filter((x) => x.date === today()).map((log) => <div className="memory record-memory" key={log.id}><div><b>训练 · {log.state}</b><br />{log.movements.map((movement) => `${movement.name} ${movement.minutes} 分钟`).join("、")}</div><button className="btn ghost task-delete" onClick={() => removeLog("workouts", log.id)} title="删除训练记录"><Trash2 size={14} /></button></div>)}
        {data.meals.filter((x) => x.date === today()).map((log) => <div className="memory record-memory" key={log.id}><div><b>{log.meal} · {log.health}</b><br />{log.content}</div><button className="btn ghost task-delete" onClick={() => removeLog("meals", log.id)} title="删除饮食记录"><Trash2 size={14} /></button></div>)}
        {data.habits.filter((x) => x.date === today()).map((log) => <div className="memory record-memory" key={log.id}><div><b>{log.category}</b> · {log.note || "已完成"}</div><button className="btn ghost task-delete" onClick={() => removeLog("habits", log.id)} title="删除日常记录"><Trash2 size={14} /></button></div>)}
        {!hasRecords && <div className="empty">还没有记录，完成一次训练或记下一餐吧。</div>}
      </div>
    </section>
  </div>;
}

function GainsView({ data, update }: { data: AppData; update: (d: AppData, m?: string) => void }) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("其他");
  const [date, setDate] = useState(today());
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [manage, setManage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ term: string; definition: string; source: string; category: string; date: string }>({ term: "", definition: "", source: "", category: "其他", date: today() });

  const gains = Array.isArray(data.gains) ? data.gains : [];
  const categories = Array.isArray(data.gainCategories) && data.gainCategories.length ? data.gainCategories : [...DEFAULT_GAIN_CATEGORIES];
  const safeData: AppData = { ...data, gains, gainCategories: categories };
  const customCategories = categories.filter((item) => !DEFAULT_GAIN_CATEGORIES.includes(item));

  const addEntry = (event: FormEvent) => {
    event.preventDefault();
    if (!term.trim()) return;
    let finalCategory = category;
    let nextCategories = categories;
    if (showNewCategory && newCategory.trim() && !categories.includes(newCategory.trim())) {
      nextCategories = [...categories, newCategory.trim()];
      finalCategory = newCategory.trim();
    }
    const entry: GainEntry = { id: crypto.randomUUID(), term: term.trim(), definition: definition.trim(), source: source.trim(), category: finalCategory, date: date || today(), createdAt: Date.now() };
    update({ ...safeData, gains: [entry, ...gains], gainCategories: nextCategories }, "已记录一条收获");
    setTerm(""); setDefinition(""); setSource(""); setCategory("其他"); setDate(today()); setNewCategory(""); setShowNewCategory(false);
  };

  const startEdit = (entry: GainEntry) => {
    setEditingId(entry.id);
    setEdit({ term: entry.term, definition: entry.definition, source: entry.source, category: entry.category, date: entry.date });
  };
  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editingId || !edit.term.trim()) return;
    update({ ...safeData, gains: gains.map((entry) => entry.id === editingId ? { ...entry, term: edit.term.trim(), definition: edit.definition.trim(), source: edit.source.trim(), category: edit.category, date: edit.date } : entry) }, "收获已更新");
    setEditingId(null);
  };
  const deleteEntry = (entry: GainEntry) => {
    if (!window.confirm(`确定删除「${entry.term}」吗？`)) return;
    update({ ...safeData, gains: gains.filter((item) => item.id !== entry.id) }, "收获已删除");
  };
  const deleteCategory = (item: string) => {
    if (!window.confirm(`删除分类「${item}」？该分类下的收获将归为「其他」。`)) return;
    update({ ...safeData, gainCategories: categories.filter((value) => value !== item), gains: gains.map((entry) => entry.category === item ? { ...entry, category: "其他" } : entry) }, `已删除分类「${item}」`);
  };

  const query = search.trim().toLowerCase();
  const filtered = gains
    .filter((entry) => filter === "all" || entry.category === filter)
    .filter((entry) => !query || [entry.term, entry.definition, entry.source].some((text) => text.toLowerCase().includes(query)))
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date > b.date ? -1 : 1));

  return <div className="section-grid">
    <section className="panel">
      <div className="panel-header"><div className="panel-title"><Lightbulb size={18} /><div><h2>记录收获</h2><div className="subtle">把今天遇到的新名词、概念随手记下来。</div></div></div></div>
      <form className="form-grid" onSubmit={addEntry}>
        <div className="field"><label>名词 / 术语</label><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="例如：漏斗分析" required /></div>
        <div className="field"><label>领域分类</label><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <div className="field full"><label>定义 / 解释</label><textarea value={definition} onChange={(event) => setDefinition(event.target.value)} placeholder="用你自己的话解释它" /></div>
        <div className="field"><label>来源</label><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="例如：某视频 / 某篇文章" /></div>
        <div className="field"><label>日期</label><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
        <div className="field full">{!showNewCategory ? <button className="btn ghost" type="button" onClick={() => setShowNewCategory(true)}><Plus size={13} /> 新增分类</button> : <div className="task-edit-fields"><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="新分类名称" /><button className="btn ghost" type="button" onClick={() => setShowNewCategory(false)}>取消</button></div>}</div>
        <div className="button-row full"><button className="btn primary" type="submit"><Plus size={15} /> 保存收获</button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-header"><div className="panel-title"><Search size={18} /><div><h2>收获清单</h2><div className="subtle">{filtered.length} 条记录 · 支持搜索与分类筛选</div></div></div></div>
      <div className="panel-pad">
        <input className="gain-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名词、定义或来源..." />
        <div className="gain-filters"><button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>全部</button>{categories.map((item) => <button key={item} className={`tab ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="gain-manage"><button className="btn ghost" onClick={() => setManage(!manage)}><Pencil size={12} /> 管理分类</button>{manage && <div className="gain-category-manager">{customCategories.length ? customCategories.map((item) => <span className="tag" key={item}>{item}<button onClick={() => deleteCategory(item)} title="删除分类" aria-label={`删除分类 ${item}`}>×</button></span>) : <span className="tiny">暂无自定义分类</span>}</div>}</div>
      </div>
      <div className="task-list">{filtered.length ? filtered.map((entry) => editingId === entry.id ? <form className="gain-edit" key={entry.id} onSubmit={saveEdit}><div className="form-grid"><div className="field"><label>名词</label><input value={edit.term} onChange={(event) => setEdit({ ...edit, term: event.target.value })} autoFocus /></div><div className="field"><label>分类</label><select value={edit.category} onChange={(event) => setEdit({ ...edit, category: event.target.value })}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="field full"><label>定义</label><textarea value={edit.definition} onChange={(event) => setEdit({ ...edit, definition: event.target.value })} /></div><div className="field"><label>来源</label><input value={edit.source} onChange={(event) => setEdit({ ...edit, source: event.target.value })} /></div><div className="field"><label>日期</label><input type="date" value={edit.date} onChange={(event) => setEdit({ ...edit, date: event.target.value })} /></div><div className="button-row full"><button className="btn primary" type="submit">保存</button><button className="btn" type="button" onClick={() => setEditingId(null)}>取消</button></div></div></form> : <div className="gain-row" key={entry.id}><div className="gain-main"><div className="gain-term">{entry.term}</div>{entry.definition && <div className="gain-definition">{entry.definition}</div>}<div className="task-info"><span className="tag">{entry.category}</span>{entry.source && <span className="tiny">来源：{entry.source}</span>}<span className="tiny">{entry.date}</span></div></div><div className="task-actions"><button className="btn ghost task-edit" onClick={() => startEdit(entry)} aria-label={`编辑 ${entry.term}`} title="编辑收获"><Pencil size={14} /></button><button className="btn ghost task-delete" onClick={() => deleteEntry(entry)} aria-label={`删除 ${entry.term}`} title="删除收获"><Trash2 size={14} /></button></div></div>) : <div className="empty">还没有收获，记录第一条吧。</div>}</div>
    </section>
  </div>;
}

function GrowthView({ data }: { data: AppData }) {
  const bars = [24, 38, 30, 64, 48, 72, 58];
  return <><section className="panel"><div className="panel-header"><div className="panel-title"><Award size={18} /><div><h2>成长档案</h2><div className="subtle">你的属性不是标签，是一段段真实行为的累计。</div></div></div><span className="tag green">LEVEL {levelFromXp(data.totalXp).level}</span></div><AttributeGrid data={data} /></section><div className="section-grid three"><section className="panel stat-card"><div className="stat-row"><div><div className="stat-number">{data.tasks.filter((x) => x.completed).length}</div><div className="subtle">已完成任务</div></div><ListChecks className="stat-icon" /></div></section><section className="panel stat-card"><div className="stat-row"><div><div className="stat-number">{data.workouts.length}</div><div className="subtle">训练记录</div></div><Dumbbell className="stat-icon" /></div></section><section className="panel stat-card"><div className="stat-row"><div><div className="stat-number">{data.memory.length}</div><div className="subtle">成长记忆</div></div><Brain className="stat-icon" /></div></section></div><section className="panel" style={{ marginTop: 16 }}><div className="panel-header"><div className="panel-title"><BarChart3 size={18} /><div><h2>近 7 日活跃度</h2><div className="subtle">先观察趋势，再决定调整。</div></div></div></div><div className="chart">{bars.map((value, index) => <div className="bar-wrap" key={index}><div className="bar" style={{ height: `${value}%` }} /><span>{["一", "二", "三", "四", "五", "六", "日"][index]}</span></div>)}</div></section></>;
}

function RewardsView({ data, update }: { data: AppData; update: (d: AppData, m?: string) => void }) {
  const emptyReward = (): Reward => ({ id: crypto.randomUUID(), name: "", emoji: "🎁", type: "消费", cost: 0, cooldownDays: 3, weeklyLimit: 1, enabled: true });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Reward>(() => emptyReward());
  const spend = weeklyRewardSpend(data.rewards);
  const startAdd = () => { setEditingId(null); setDraft(emptyReward()); setShowForm(true); };
  const startEdit = (reward: Reward) => { setEditingId(reward.id); setDraft({ ...reward }); setShowForm(true); };
  const saveReward = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const cleaned: Reward = {
      ...draft,
      name: draft.name.trim(),
      emoji: draft.emoji.trim() || "🎁",
      cost: Math.max(0, Number(draft.cost) || 0),
      cooldownDays: Math.max(0, Math.floor(Number(draft.cooldownDays) || 0)),
      weeklyLimit: Math.max(1, Math.floor(Number(draft.weeklyLimit) || 1)),
    };
    update({ ...data, rewards: editingId ? data.rewards.map((item) => item.id === editingId ? cleaned : item) : [...data.rewards, cleaned] }, editingId ? "奖励已更新" : "已加入奖励池");
    setShowForm(false);
  };
  const removeReward = (reward: Reward) => {
    if (data.rewards.length <= 1) return;
    if (!window.confirm(`确定删除奖励「${reward.name}」吗？`)) return;
    update({ ...data, rewards: data.rewards.filter((item) => item.id !== reward.id) }, "奖励已删除");
  };
  const restoreDefaults = () => {
    if (!window.confirm("将用默认奖励池覆盖当前奖励，确定吗？")) return;
    update({ ...data, rewards: createDefaultRewards() }, "已恢复默认奖励池");
  };
  const draw = () => {
    if (data.draws < 1) return;
    const eligible = data.rewards.filter((reward) => reward.enabled);
    if (!eligible.length) return;
    const selected = eligible[Math.floor(Math.random() * eligible.length)];
    const nextRewards = data.rewards.map((reward) => reward.id === selected.id ? { ...reward, awardedAt: new Date().toISOString() } : reward);
    update({ ...data, draws: data.draws - 1, rewards: nextRewards }, `掉落奖励：${selected.emoji} ${selected.name}`);
  };
  return <><section className="quest-banner"><div><div className="quest-title">奖励抽取站</div><div className="quest-copy">完成学习主任务 + 健康/日常主任务，连续 3 天解锁一次现实奖励。</div></div><button className="btn primary" onClick={draw} disabled={data.draws < 1}><Gift size={15} /> {data.draws > 0 ? `抽取奖励（${data.draws}）` : "暂无抽奖资格"}</button></section><section className="panel" style={{ marginTop: 16 }}><div className="panel-header"><div className="panel-title"><WalletCards size={18} /><div><h2>你的奖励池</h2><div className="subtle">本周消费预算记录：¥{spend} · 奖励需要有边界，才会真正有价值。</div></div></div><div className="button-row"><button className="btn ghost" onClick={restoreDefaults}>恢复默认</button><button className="btn primary" onClick={startAdd}><Plus size={14} /> 新增奖励</button></div></div>{showForm && <form className="form-grid reward-form" onSubmit={saveReward}><div className="field"><label>奖励名称</label><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：看两小时综艺" autoFocus /></div><div className="field"><label>图标 Emoji</label><input value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} placeholder="例如：🎁" maxLength={4} /></div><div className="field"><label>奖励类型</label><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Reward["type"], cost: event.target.value === "时间" ? 0 : draft.cost })}><option value="消费">消费</option><option value="时间">时间</option></select></div><div className="field"><label>预算金额（元）</label><input type="number" min="0" disabled={draft.type === "时间"} value={draft.cost} onChange={(event) => setDraft({ ...draft, cost: Number(event.target.value) })} /></div><div className="field"><label>冷却天数</label><input type="number" min="0" value={draft.cooldownDays} onChange={(event) => setDraft({ ...draft, cooldownDays: Number(event.target.value) })} /></div><div className="field"><label>每周最多次数</label><input type="number" min="1" value={draft.weeklyLimit} onChange={(event) => setDraft({ ...draft, weeklyLimit: Number(event.target.value) })} /></div><label className="check-field full"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> 启用此奖励（关闭后不会被抽中）</label><div className="button-row full"><button className="btn primary" type="submit">{editingId ? "保存修改" : "加入奖励池"}</button><button className="btn" type="button" onClick={() => setShowForm(false)}>取消</button></div></form>}<div className="reward-grid">{data.rewards.map((reward) => <div className="reward-card panel" key={reward.id}><div className="reward-card-header"><div className="reward-emoji">{reward.emoji}</div><div className="task-actions"><button className="btn ghost task-edit" onClick={() => startEdit(reward)} title={`编辑 ${reward.name}`}><Pencil size={14} /></button><button className="btn ghost task-delete" onClick={() => removeReward(reward)} disabled={data.rewards.length <= 1} title={data.rewards.length <= 1 ? "请至少保留一个奖励" : `删除 ${reward.name}`}><Trash2 size={14} /></button></div></div><div><div className="reward-name">{reward.name}</div><div className="reward-meta">{reward.type} · 冷却 {reward.cooldownDays} 天 · 每周 {reward.weeklyLimit} 次</div></div><div className="button-row"><button className={`tag reward-switch ${reward.enabled ? "green" : ""}`} onClick={() => update({ ...data, rewards: data.rewards.map((item) => item.id === reward.id ? { ...item, enabled: !item.enabled } : item) }, reward.enabled ? "奖励已停用" : "奖励已启用")}>{reward.enabled ? "已启用" : "已停用"}</button><span className={`tag ${reward.awardedAt ? "green" : ""}`}>{reward.awardedAt ? "待领取" : reward.cost ? `预算 ¥${reward.cost}` : "时间奖励"}</span>{reward.awardedAt && <button className="btn ghost" onClick={() => update({ ...data, rewards: data.rewards.map((item) => item.id === reward.id ? { ...item, awardedAt: undefined, claimedAt: new Date().toISOString() } : item) }, "已记录奖励领取")}>标记领取</button>}</div></div>)}</div></section></>;
}

function CoachView({ data, update }: { data: AppData; update: (d: AppData, m?: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("我是你的理性教练。告诉我你现在卡在哪里，我会基于今天的任务和记录，帮你拆成下一步。");
  const [loading, setLoading] = useState(false);
  const ask = async (event: FormEvent) => {
    event.preventDefault(); if (!prompt.trim()) return; setLoading(true);
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, data }) });
      const result = await response.json(); setAnswer(result.answer); setPrompt("");
    } catch { setAnswer("当前 AI 服务未连接，但你的记录仍然保存在本地。先把问题拆成一个 25 分钟内能完成的动作。"); } finally { setLoading(false); }
  };
  const review = () => { setAnswer(`今日完成了 ${data.tasks.filter((t) => t.completed).length} 个任务，累计 ${data.totalXp} XP。建议：先完成剩下的训练主任务，再用 10 分钟更新 Ozon 台账。今晚复盘时记录一个具体证据，不要只写“感觉不错”。`); };
  return <div className="section-grid"><section className="panel"><div className="panel-header"><div className="panel-title"><MessageSquare size={18} /><div><h2>AI 理性教练</h2><div className="subtle">基于事实，不替你做决定。</div></div></div><span className="tag green">ONLINE / LOCAL FALLBACK</span></div><div className="panel-pad"><div className="memory" style={{ borderColor: "#C996FF", fontSize: 14 }}>{answer}</div><form onSubmit={ask} style={{ marginTop: 16 }}><div className="field"><label>告诉教练你的问题</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="例如：我今天只有 1 小时，数据分析和训练怎么安排？" /></div><div className="button-row" style={{ marginTop: 12 }}><button className="btn primary" disabled={loading}>{loading ? "思考中..." : "发送给教练"} <ArrowUpRight size={14} /></button><button className="btn" type="button" onClick={review}>生成今日复盘</button></div></form></div></section><section className="panel"><div className="panel-header"><div className="panel-title"><Brain size={18} /><div><h2>长期记忆</h2><div className="subtle">只有确认过的事实会留下。</div></div></div></div><div className="panel-pad">{data.memory.map((memory) => <div className="memory" key={memory}>{memory}</div>)}<button className="btn ghost" style={{ marginTop: 13 }} onClick={() => update({ ...data, memory: [...data.memory, "今天希望保持早计划、晚复盘的节奏。"] }, "已加入一条成长记忆")}><Plus size={13} /> 记住今天的偏好</button></div></section></div>;
}

function SettingsView({ data, update, onSignOut }: { data: AppData; update: (d: AppData, m?: string) => void; onSignOut?: () => void }) {
  const exportData = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "growth-companion-export.json"; a.click(); URL.revokeObjectURL(url); };
  const reset = () => { if (window.confirm("将清空本机演示数据并回到初始状态，确定吗？")) { const next = createInitialData(); update(next, "已恢复演示数据"); } };
  return <div className="section-grid"><section className="panel"><div className="panel-header"><div className="panel-title"><Settings size={18} /><div><h2>个人档案</h2><div className="subtle">这些信息会帮助 AI 理解你的长期方向。</div></div></div></div><form className="form-grid" onSubmit={(event) => { event.preventDefault(); update(data, "个人档案已保存"); }}><div className="field"><label>昵称</label><input value={data.userName} onChange={(e) => update({ ...data, userName: e.target.value })} /></div><div className="field"><label>时区</label><input value="Asia/Shanghai" readOnly /></div><div className="field full"><label>长期目标</label><textarea value={data.goal} onChange={(e) => update({ ...data, goal: e.target.value })} /></div><div className="button-row full"><button className="btn primary">保存档案</button></div></form></section><section className="panel"><div className="panel-header"><div className="panel-title"><CircleHelp size={18} /><div><h2>数据与集成</h2><div className="subtle">{onSignOut ? "Supabase 云端模式" : "本地演示模式"}</div></div></div></div><div className="panel-pad"><div className="memory"><b>{onSignOut ? "Cloud sync enabled" : "Local-first"}</b><br />{onSignOut ? "任务、生活记录和成长档案会同步到当前 Supabase 用户。" : "当前数据保存在浏览器本地。配置 Supabase 环境变量后可启用云端同步。"}</div><div className="button-row" style={{ marginTop: 14 }}><button className="btn" onClick={exportData}><ArrowUpRight size={14} /> 导出 JSON</button><button className="btn" onClick={reset}><Trash2 size={14} /> 重置演示数据</button>{onSignOut && <button className="btn" onClick={onSignOut}>退出登录</button>}</div></div></section></div>;
}
