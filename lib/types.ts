export type AttributeKey = "intellect" | "creativity" | "vitality" | "endurance" | "discipline";
export type TaskCategory = "learning" | "ai" | "english" | "workout" | "habit" | "social" | "rest";
export type AppView = "home" | "plan" | "record" | "gains" | "growth" | "rewards" | "coach" | "settings";

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  date: string;
  plannedMinutes: number;
  actualMinutes?: number;
  isMain: boolean;
  completed: boolean;
  notes?: string;
  track: string;
  xpAwarded?: number;
  penalized?: boolean;
  penaltyXp?: number;
  penaltyStats?: Partial<Record<AttributeKey, number>>;
}

export interface WorkoutLog {
  id: string;
  date: string;
  movements: { name: string; minutes: number }[];
  state: "精力充足" | "正常" | "疲劳" | "明显不适";
  notes?: string;
}

export interface MealLog {
  id: string;
  date: string;
  meal: "早餐" | "午餐" | "晚餐" | "加餐";
  content: string;
  health: "均衡" | "一般" | "放纵";
  isReward: boolean;
}

export interface HabitLog {
  id: string;
  date: string;
  category: "睡眠" | "作息/饮水" | "阅读/整理" | "社交" | "休息娱乐";
  minutes: number;
  completed: boolean;
  note?: string;
}

export interface GainEntry {
  id: string;
  term: string;
  definition: string;
  source: string;
  category: string;
  date: string;
  createdAt: number;
}

export interface Reward {
  id: string;
  name: string;
  emoji: string;
  type: "消费" | "时间";
  cost: number;
  cooldownDays: number;
  weeklyLimit: number;
  enabled: boolean;
  claimedAt?: string;
  awardedAt?: string;
}

export interface AppData {
  onboarded: boolean;
  userName: string;
  goal: string;
  totalXp: number;
  stats: Record<AttributeKey, number>;
  tasks: Task[];
  workouts: WorkoutLog[];
  meals: MealLog[];
  habits: HabitLog[];
  gains: GainEntry[];
  gainCategories: string[];
  rewards: Reward[];
  draws: number;
  streak: number;
  memory: string[];
}
