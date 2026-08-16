import type { AppData, AttributeKey, Task, TaskCategory } from "./types";

export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
export const DEFAULT_GAIN_CATEGORIES = ["数据分析", "AI", "英语", "其他"];

export const attributeMeta: Record<AttributeKey, { label: string; short: string; color: string }> = {
  intellect: { label: "智力", short: "INT", color: "#54D6FF" },
  creativity: { label: "创意", short: "CRE", color: "#F6B64A" },
  vitality: { label: "体力", short: "VIT", color: "#FE766C" },
  endurance: { label: "耐力", short: "END", color: "#79DD9B" },
  discipline: { label: "自律", short: "DIS", color: "#C996FF" },
};

const rewardsByCategory: Record<TaskCategory, { xp: number; attributes: Partial<Record<AttributeKey, number>> }> = {
  learning: { xp: 24, attributes: { intellect: 4, discipline: 2 } },
  ai: { xp: 28, attributes: { intellect: 3, creativity: 4 } },
  english: { xp: 20, attributes: { intellect: 3, discipline: 2 } },
  workout: { xp: 26, attributes: { vitality: 4, endurance: 3 } },
  habit: { xp: 12, attributes: { discipline: 3, endurance: 1 } },
  social: { xp: 16, attributes: { creativity: 3, discipline: 1 } },
  rest: { xp: 10, attributes: { endurance: 2, discipline: 1 } },
};

export function levelFromXp(xp: number) {
  let level = 1;
  let remaining = xp;
  while (remaining >= 100 + (level - 1) * 25) {
    remaining -= 100 + (level - 1) * 25;
    level += 1;
  }
  return { level, current: remaining, needed: 100 + (level - 1) * 25 };
}

export function taskReward(task: Task) {
  const base = rewardsByCategory[task.category];
  const actual = task.actualMinutes ?? task.plannedMinutes;
  const ratio = Math.min(1.25, Math.max(0.5, actual / Math.max(task.plannedMinutes, 1)));
  const stats = Object.fromEntries(
    Object.entries(base.attributes).map(([key, value]) => [key, Math.max(1, Math.round((value ?? 0) * ratio))]),
  ) as Partial<Record<AttributeKey, number>>;
  return { xp: Math.round(base.xp * ratio), stats };
}

export function dayOffset(offset: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(Date.now() + offset * 86400000));
}

export const MAX_DAILY_ATTRIBUTE_PENALTY = 30;
export const MAX_DAILY_XP_PENALTY = 50;

export function taskPenalty(task: Task) {
  const base = taskReward({ ...task, actualMinutes: task.plannedMinutes });
  const isMain = task.isMain;
  const xp = isMain ? base.xp : Math.max(5, Math.round(base.xp / 2));
  const stats = Object.fromEntries(
    Object.entries(base.stats).map(([key, value]) => [key, isMain ? (value ?? 0) : Math.max(1, Math.ceil((value ?? 0) / 2))]),
  ) as Partial<Record<AttributeKey, number>>;
  return { xp, stats };
}

export interface SettlementResult {
  data: AppData;
  settledCount: number;
  xpPenalty: number;
  attributePenalty: number;
}

export function settleMissedTasks(input: AppData, date = today()): SettlementResult {
  const overdue = input.tasks
    .filter((task) => !task.completed && !task.penalized && task.date < date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (overdue.length === 0) {
    return { data: input, settledCount: 0, xpPenalty: 0, attributePenalty: 0 };
  }

  const next: AppData = { ...input, stats: { ...input.stats } };
  let xpPenalty = 0;
  let attributePenalty = 0;
  let settledCount = 0;

  for (const task of overdue) {
    const xpRemaining = MAX_DAILY_XP_PENALTY - xpPenalty;
    let attrRemaining = MAX_DAILY_ATTRIBUTE_PENALTY - attributePenalty;
    if (xpRemaining <= 0 && attrRemaining <= 0) break;

    const penalty = taskPenalty(task);
    const appliedStats: Partial<Record<AttributeKey, number>> = {};
    for (const [key, value] of Object.entries(penalty.stats) as [AttributeKey, number][]) {
      const scaled = Math.min(value, Math.max(0, attrRemaining));
      appliedStats[key] = scaled;
      next.stats[key] = Math.max(0, next.stats[key] - scaled);
      attrRemaining -= scaled;
      attributePenalty += scaled;
    }
    const appliedXp = Math.min(penalty.xp, Math.max(0, xpRemaining));
    next.totalXp = Math.max(0, next.totalXp - appliedXp);
    xpPenalty += appliedXp;

    next.tasks = next.tasks.map((item) =>
      item.id === task.id ? { ...item, penalized: true, penaltyXp: appliedXp, penaltyStats: appliedStats } : item,
    );
    settledCount += 1;
  }

  return { data: next, settledCount, xpPenalty, attributePenalty };
}

export function refundTaskPenalty(data: AppData, taskId: string): AppData {
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task?.penalized) return data;
  const next: AppData = { ...data, stats: { ...data.stats } };
  next.totalXp += task.penaltyXp ?? 0;
  (Object.entries(task.penaltyStats ?? {}) as [AttributeKey, number][]).forEach(([key, value]) => {
    next.stats[key] += value;
  });
  return next;
}

export function isDailyQualified(data: AppData, date = today()) {
  const dayTasks = data.tasks.filter((task) => task.date === date && task.completed && task.isMain);
  const learningDone = dayTasks.some((task) => ["learning", "ai", "english"].includes(task.category));
  const wellbeingDone =
    dayTasks.some((task) => ["workout", "habit", "social", "rest"].includes(task.category)) ||
    data.workouts.some((log) => log.date === date) ||
    data.habits.some((log) => log.date === date && log.completed);
  return learningDone && wellbeingDone;
}

export function weeklyRewardSpend(rewards: AppData["rewards"]) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return rewards.reduce((sum, reward) => {
    const claimed = reward.claimedAt ? new Date(reward.claimedAt).getTime() : 0;
    return claimed >= since ? sum + reward.cost : sum;
  }, 0);
}

export function createInitialData(): AppData {
  const date = today();
  return {
    onboarded: false,
    userName: "探索者",
    goal: "在 2027 年寒假前拿到数据分析相关实习",
    totalXp: 338,
    stats: { intellect: 37, creativity: 23, vitality: 28, endurance: 31, discipline: 42 },
    draws: 1,
    streak: 3,
    memory: ["正在系统学习数据分析，当前重点是数据诊断与指标体系。", "偏好具体、可执行、基于事实的复盘。"],
    tasks: [
      { id: "t1", title: "数据诊断：完成一次异常归因练习", category: "learning", date, plannedMinutes: 75, actualMinutes: 75, isMain: true, completed: true, track: "数据分析", xpAwarded: 24 },
      { id: "t2", title: "Ozon 商品经营台账更新", category: "ai", date, plannedMinutes: 45, isMain: false, completed: false, track: "AI 实操" },
      { id: "t3", title: "英语精听 1 节", category: "english", date, plannedMinutes: 30, isMain: false, completed: false, track: "英语学习" },
      { id: "t4", title: "力量训练与拉伸", category: "workout", date, plannedMinutes: 40, isMain: true, completed: false, track: "身体训练" },
      { id: "t5", title: "睡前阅读与整理", category: "habit", date, plannedMinutes: 20, isMain: false, completed: false, track: "日常习惯" },
    ],
    workouts: [],
    meals: [],
    habits: [],
    gains: [],
    gainCategories: [...DEFAULT_GAIN_CATEGORIES],
    rewards: [
      { id: "r1", name: "一杯奶茶", emoji: "🥤", type: "消费", cost: 18, cooldownDays: 5, weeklyLimit: 1, enabled: true },
      { id: "r2", name: "看一场电影", emoji: "🎬", type: "时间", cost: 0, cooldownDays: 7, weeklyLimit: 1, enabled: true },
      { id: "r3", name: "玩一局游戏", emoji: "🎮", type: "时间", cost: 0, cooldownDays: 2, weeklyLimit: 2, enabled: true },
      { id: "r4", name: "一份小食", emoji: "🍿", type: "消费", cost: 12, cooldownDays: 4, weeklyLimit: 1, enabled: true },
    ],
  };
}

export function hydrateData(value: Partial<AppData> | null): AppData {
  const initial = createInitialData();
  if (!value) return initial;
  return {
    ...initial,
    ...value,
    stats: { ...initial.stats, ...(value.stats ?? {}) },
    tasks: value.tasks ?? initial.tasks,
    workouts: value.workouts ?? [],
    meals: value.meals ?? [],
    habits: value.habits ?? [],
    gains: value.gains ?? [],
    gainCategories: value.gainCategories ?? initial.gainCategories,
    rewards: value.rewards ?? initial.rewards,
    memory: value.memory ?? initial.memory,
  };
}
