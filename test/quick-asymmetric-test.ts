import dotenv from "dotenv"; dotenv.config({ path: ".env.local" });
import { runAsymmetricSwarm } from "../src/lib/agents/integratedEngine";

const config = { provider: "deepseek" as const, model: "deepseek-chat" };

const events = [
  { name: "Brexit", news: "2016年6月24日，英国公投51.9%支持脱欧。英镑暴跌8.1%。全球股市重挫。英格兰银行声明准备提供2500亿英镑流动性。", vix: 25.8, rsi: 30, drop: 5.3, actual: "up" },
  { name: "Lehman", news: "2008年9月15日，雷曼兄弟申请破产保护。美国政府拒绝救助。美林被迫出售。AIG寻求400亿紧急贷款。道指暴跌504点(-4.4%)。全球股市重挫，信贷市场冻结。", vix: 31.7, rsi: 32, drop: 22.0, actual: "down" },
];

async function main() {
  for (const ev of events) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📰 ${ev.name} (实际: ${ev.actual})`);
    const r = await runAsymmetricSwarm(ev.news, config, 2, { vix: ev.vix, rsi: ev.rsi, dropFromPeak: ev.drop });
    const dir = r.finalConsensus > 10 ? "up" : r.finalConsensus < -10 ? "down" : "neutral";
    const ok = dir === ev.actual ? "✅" : "❌";
    console.log(`🎯 共识=${r.finalConsensus.toFixed(0)} → ${dir} ${ok}`);
    if (r.analysis?.coreContradiction) console.log(`🧠 ${r.analysis.coreContradiction.slice(0, 120)}`);
  }
}
main().catch(e => console.error("FATAL:", e.message));
