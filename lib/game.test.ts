import { describe, expect, it } from "vitest";
import { createInitialData, isDailyQualified, levelFromXp, refundTaskPenalty, settleMissedTasks, taskPenalty, taskReward, today } from "./game";
import type { Task } from "./types";

describe("growth rules", () => {
  it("calculates levels using the progressive XP threshold", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: 100 });
    expect(levelFromXp(100)).toEqual({ level: 2, current: 0, needed: 125 });
    expect(levelFromXp(225)).toEqual({ level: 3, current: 0, needed: 150 });
  });

  it("caps task rewards at 125 percent of the planned duration", () => {
    const task = { id: "test", title: "SQL", category: "learning" as const, date: today(), plannedMinutes: 40, actualMinutes: 160, isMain: true, completed: false, track: "数据分析" };
    expect(taskReward(task).xp).toBe(30);
    expect(taskReward({ ...task, actualMinutes: 5 }).xp).toBe(12);
  });

  it("requires both a learning and wellbeing main task for a qualified day", () => {
    const data = createInitialData();
    data.tasks = data.tasks.map((task) => ({ ...task, completed: task.category === "learning" || task.category === "workout" }));
    expect(isDailyQualified(data)).toBe(true);
    data.tasks = data.tasks.map((task) => task.category === "workout" ? { ...task, completed: false } : task);
    expect(isDailyQualified(data)).toBe(false);
  });

  it("deducts full reward for missed main tasks and half for normal tasks", () => {
    const main = taskPenalty({ id: "1", title: "学习", category: "learning", date: today(), plannedMinutes: 40, actualMinutes: 40, isMain: true, completed: false, track: "数据分析" });
    const normal = taskPenalty({ id: "2", title: "AI", category: "ai", date: today(), plannedMinutes: 40, actualMinutes: 40, isMain: false, completed: false, track: "AI 实操" });
    expect(main.xp).toBe(24);
    expect(main.stats.intellect).toBe(4);
    expect(normal.xp).toBe(14);
    expect(normal.stats.creativity).toBe(2);
  });

  it("settles overdue incomplete tasks once and skips completed or future tasks", () => {
    const data = createInitialData();
    const past = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(Date.now() - 86400000));
    const overdue: Task = { id: "old", title: "逾期任务", category: "learning", date: past, plannedMinutes: 40, isMain: true, completed: false, track: "数据分析" };
    data.tasks = [overdue, { ...overdue, id: "done", completed: true }];
    data.totalXp = 100;
    data.stats.intellect = 10;
    const result = settleMissedTasks(data);
    expect(result.settledCount).toBe(1);
    expect(result.xpPenalty).toBe(24);
    expect(result.data.totalXp).toBe(76);
    expect(result.data.stats.intellect).toBe(6);
    const again = settleMissedTasks(result.data);
    expect(again.settledCount).toBe(0);
  });

  it("refunds penalty when a penalized task is deleted or deferred", () => {
    const data = createInitialData();
    const past = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(Date.now() - 86400000));
    data.tasks = [{ id: "old", title: "逾期", category: "learning", date: past, plannedMinutes: 40, isMain: true, completed: false, track: "数据分析" }];
    data.totalXp = 100;
    data.stats.intellect = 10;
    const settled = settleMissedTasks(data).data;
    const refunded = refundTaskPenalty(settled, "old");
    expect(refunded.totalXp).toBe(100);
    expect(refunded.stats.intellect).toBe(10);
  });
});
