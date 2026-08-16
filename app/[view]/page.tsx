import { GrowthApp } from "@/components/growth-app";
import type { AppView } from "@/lib/types";

const validViews: AppView[] = ["plan", "record", "gains", "growth", "rewards", "coach", "settings"];

export const dynamic = "force-dynamic";

export default async function ViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  return <GrowthApp initialView={validViews.includes(view as AppView) ? (view as AppView) : "home"} />;
}
