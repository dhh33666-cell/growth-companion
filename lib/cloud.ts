import type { SupabaseClient } from "@supabase/supabase-js";
import { createDefaultRewards, DEFAULT_GAIN_CATEGORIES } from "./game";
import type { AppData, GainEntry, HabitLog, MealLog, Task, WorkoutLog } from "./types";

type CloudClient = SupabaseClient;

const syncQueues = new Map<string, Promise<void>>();

function stableUuid(value: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    hashA = Math.imul(hashA ^ code, 16777619);
    hashB = Math.imul(hashB ^ (code + 31), 2246822519);
  }
  const hex = `${(hashA >>> 0).toString(16).padStart(8, "0")}${(hashB >>> 0).toString(16).padStart(8, "0")}${(hashA ^ hashB >>> 0).toString(16).padStart(8, "0")}${(hashB ^ hashA >>> 0).toString(16).padStart(8, "0")}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function dedupeBy<T>(items: T[], signature: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = signature(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function taskFromRow(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as Task["category"],
    date: String(row.scheduled_date),
    plannedMinutes: Number(row.planned_minutes ?? 25),
    actualMinutes: row.actual_minutes == null ? undefined : Number(row.actual_minutes),
    isMain: Boolean(row.is_main),
    completed: Boolean(row.completed),
    notes: row.notes ? String(row.notes) : undefined,
    track: String(row.track ?? ""),
    penalized: Boolean(row.penalized),
    penaltyXp: row.penalty_xp == null ? undefined : Number(row.penalty_xp),
    penaltyStats: (row.penalty_stats as Task["penaltyStats"]) ?? undefined,
  };
}

export async function loadCloudData(client: CloudClient, userId: string): Promise<AppData | null> {
  const [profileResult, tasksResult, workoutsResult, mealsResult, habitsResult, rewardsResult, memoriesResult, gainsResult] = await Promise.all([
    client.from("profiles").select("*").eq("id", userId).maybeSingle(),
    client.from("tasks").select("*").eq("user_id", userId).order("scheduled_date", { ascending: false }),
    client.from("workout_logs").select("*").eq("user_id", userId).order("logged_date", { ascending: false }),
    client.from("meal_logs").select("*").eq("user_id", userId).order("logged_date", { ascending: false }),
    client.from("habit_logs").select("*").eq("user_id", userId).order("logged_date", { ascending: false }),
    client.from("rewards").select("*").eq("user_id", userId).order("created_at"),
    client.from("memory_summaries").select("*").eq("user_id", userId).eq("confirmed", true).order("created_at"),
    client.from("gains").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) return null;
  if (tasksResult.error) throw tasksResult.error;
  if (workoutsResult.error) throw workoutsResult.error;
  if (mealsResult.error) throw mealsResult.error;
  if (habitsResult.error) throw habitsResult.error;
  if (rewardsResult.error) throw rewardsResult.error;
  if (memoriesResult.error) throw memoriesResult.error;
  if (gainsResult.error) throw gainsResult.error;

  const profile = profileResult.data;
  const cloudRewards = dedupeBy((rewardsResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji ?? "🎁"),
    type: row.reward_type as "消费" | "时间",
    cost: Number(row.cost ?? 0),
    cooldownDays: Number(row.cooldown_days ?? 0),
    weeklyLimit: Number(row.weekly_limit ?? 1),
    enabled: Boolean(row.enabled),
    awardedAt: row.awarded_at ? String(row.awarded_at) : undefined,
    claimedAt: row.claimed_at ? String(row.claimed_at) : undefined,
  })), (reward) => JSON.stringify([
    reward.name, reward.emoji, reward.type, reward.cost, reward.cooldownDays,
    reward.weeklyLimit, reward.enabled, reward.awardedAt ?? null, reward.claimedAt ?? null,
  ]));
  return {
    onboarded: Boolean(profile.onboarded),
    userName: profile.user_name,
    goal: profile.goal,
    totalXp: Number(profile.total_xp ?? 0),
    stats: {
      intellect: Number(profile.intellect ?? 0),
      creativity: Number(profile.creativity ?? 0),
      vitality: Number(profile.vitality ?? 0),
      endurance: Number(profile.endurance ?? 0),
      discipline: Number(profile.discipline ?? 0),
    },
    tasks: dedupeBy((tasksResult.data ?? []).map((row) => taskFromRow(row)), (task) => JSON.stringify([
      task.title, task.category, task.date, task.plannedMinutes, task.actualMinutes ?? null, task.isMain,
      task.completed, task.notes ?? "", task.track, task.penalized ?? false, task.penaltyXp ?? 0,
      task.penaltyStats ?? {},
    ])),
    workouts: (workoutsResult.data ?? []).map((row): WorkoutLog => ({
      id: String(row.id),
      date: String(row.logged_date),
      movements: (row.movements as WorkoutLog["movements"]) ?? [],
      state: row.state as WorkoutLog["state"],
      notes: row.notes ? String(row.notes) : undefined,
    })),
    meals: (mealsResult.data ?? []).map((row): MealLog => ({
      id: String(row.id),
      date: String(row.logged_date),
      meal: row.meal_type as MealLog["meal"],
      content: String(row.content),
      health: row.health_level as MealLog["health"],
      isReward: Boolean(row.is_reward),
    })),
    habits: (habitsResult.data ?? []).map((row): HabitLog => ({
      id: String(row.id),
      date: String(row.logged_date),
      category: row.category as HabitLog["category"],
      minutes: Number(row.minutes ?? 0),
      completed: Boolean(row.completed),
      note: row.note ? String(row.note) : undefined,
    })),
    gains: dedupeBy((gainsResult.data ?? []).map((row): GainEntry => ({
      id: String(row.id),
      term: String(row.term),
      definition: row.definition ? String(row.definition) : "",
      source: row.source ? String(row.source) : "",
      category: String(row.category ?? "其他"),
      date: String(row.logged_date),
      createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : 0,
    })), (gain) => JSON.stringify([gain.term, gain.definition, gain.source, gain.category, gain.date])),
    gainCategories: Array.isArray(profile.gain_categories) ? profile.gain_categories.map(String) : [...DEFAULT_GAIN_CATEGORIES],
    rewards: cloudRewards.length ? cloudRewards : createDefaultRewards(),
    draws: 0,
    streak: 0,
    memory: (memoriesResult.data ?? []).map((row) => String(row.content)),
  };
}

async function syncCloudDataNow(client: CloudClient, userId: string, data: AppData) {
  const profileBase = {
    id: userId,
    user_name: data.userName,
    goal: data.goal,
    timezone: "Asia/Shanghai",
    onboarded: data.onboarded,
    total_xp: data.totalXp,
    intellect: data.stats.intellect,
    creativity: data.stats.creativity,
    vitality: data.stats.vitality,
    endurance: data.stats.endurance,
    discipline: data.stats.discipline,
  };
  const profile = await client.from("profiles").upsert({ ...profileBase, gain_categories: data.gainCategories });
  if (profile.error) {
    const profileFallback = await client.from("profiles").upsert(profileBase);
    if (profileFallback.error) throw profileFallback.error;
  }

  const reconcile = async (table: string, rows: Record<string, unknown>[]) => {
    const current = await client.from(table).select("id").eq("user_id", userId);
    if (current.error) throw current.error;
    if (rows.length) {
      const written = await client.from(table).upsert(rows, { onConflict: "id" });
      if (written.error) throw written.error;
    }
    const keepIds = new Set(rows.map((row) => String(row.id)));
    const removeIds = (current.data ?? []).map((row) => String(row.id)).filter((id) => !keepIds.has(id));
    if (removeIds.length) {
      const removed = await client.from(table).delete().eq("user_id", userId).in("id", removeIds);
      if (removed.error) throw removed.error;
    }
  };

  {
    const rows = (withPenalty: boolean) => data.tasks.map((task) => ({
      id: stableUuid(task.id),
      user_id: userId,
      title: task.title,
      category: task.category,
      track: task.track,
      scheduled_date: task.date,
      planned_minutes: task.plannedMinutes,
      actual_minutes: task.actualMinutes ?? null,
      is_main: task.isMain,
      completed: task.completed,
      notes: task.notes ?? null,
      ...(withPenalty
        ? { penalized: task.penalized ?? false, penalty_xp: task.penaltyXp ?? 0, penalty_stats: task.penaltyStats ?? {} }
        : {}),
    }));
    try { await reconcile("tasks", rows(true)); }
    catch { await reconcile("tasks", rows(false)); }
  }
  await reconcile("workout_logs", data.workouts.map((log) => ({
      id: stableUuid(log.id),
      user_id: userId, logged_date: log.date, movements: log.movements, state: log.state, notes: log.notes ?? null,
    })));
  await reconcile("meal_logs", data.meals.map((log) => ({
      id: stableUuid(log.id),
      user_id: userId, logged_date: log.date, meal_type: log.meal, content: log.content, health_level: log.health, is_reward: log.isReward,
    })));
  await reconcile("habit_logs", data.habits.map((log) => ({
      id: stableUuid(log.id),
      user_id: userId, logged_date: log.date, category: log.category, minutes: log.minutes, completed: log.completed, note: log.note ?? null,
    })));
  await reconcile("rewards", data.rewards.map((reward) => ({
      id: stableUuid(reward.id),
      user_id: userId, name: reward.name, emoji: reward.emoji, reward_type: reward.type, cost: reward.cost,
      cooldown_days: reward.cooldownDays, weekly_limit: reward.weeklyLimit, enabled: reward.enabled,
      awarded_at: reward.awardedAt ?? null, claimed_at: reward.claimedAt ?? null,
    })));
  await reconcile("memory_summaries", data.memory.map((content) => ({
      id: stableUuid(`memory:${content}`),
      user_id: userId, summary_type: "manual", content, confirmed: true,
    })));
  try {
    await reconcile("gains", data.gains.map((gain) => ({
        id: stableUuid(gain.id),
        user_id: userId,
        term: gain.term,
        definition: gain.definition,
        source: gain.source,
        category: gain.category,
        logged_date: gain.date,
      })));
  } catch {
    // gains 表可能尚未创建，忽略错误以免影响其他数据同步
  }
}

export function syncCloudData(client: CloudClient, userId: string, data: AppData) {
  const previous = syncQueues.get(userId) ?? Promise.resolve();
  const current = previous.then(() => syncCloudDataNow(client, userId, data));
  const settled = current.then(() => undefined, () => undefined);
  syncQueues.set(userId, settled);
  return current;
}
