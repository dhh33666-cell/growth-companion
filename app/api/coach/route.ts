import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, data } = await request.json();
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    const fallback = () => {
      const completed = data?.tasks?.filter((task: { completed: boolean }) => task.completed).length ?? 0;
      return NextResponse.json({
        answer: `我先用本地规则帮你看：今天已完成 ${completed} 个任务。关于“${String(prompt).slice(0, 60)}”，建议先拆出一个 25 分钟的最小动作，完成后再决定是否扩大范围。配置有效的 AI_BASE_URL、AI_API_KEY 和 AI_MODEL 后可切换到真实模型。`,
        mode: "local-fallback",
      });
    };

    if (!baseUrl || !apiKey || !model) return fallback();

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: "你是一个理性、具体、基于事实的中文成长教练。不要做医疗诊断，不编造用户行为。只给可执行的下一步，并在需要时建议休息。" },
          { role: "user", content: `用户问题：${prompt}\n今日结构化记录：${JSON.stringify(data)}` },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return fallback();
    const json = await response.json();
    return NextResponse.json({ answer: json.choices?.[0]?.message?.content ?? "模型没有返回可用内容。", mode: "remote" });
  } catch {
    return NextResponse.json({
      answer: "AI 服务暂时不可用，但你的记录没有丢失。先把当前问题拆成一个 25 分钟内能完成的最小动作。",
      mode: "local-fallback",
    });
  }
}
