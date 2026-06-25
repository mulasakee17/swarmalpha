/**
 * 数据质量检查: 分析 106 事件中 VIX/RSI/跌幅数据的异常模式
 */
import { readFileSync } from "fs";

const code = readFileSync("test/strict-backtest.ts", "utf-8");

// Extract VIX/RSI/drop
const vixVals: number[] = [];
const rsiVals: number[] = [];
const dropVals: number[] = [];
const volVals: number[] = [];
const volSpikeVals: number[] = [];

const blockRegex = /knownData:\s*\{([^}]+)\}/g;
let match;
while ((match = blockRegex.exec(code)) !== null) {
  const block = match[1];
  const vixM = block.match(/vix:\s*([\d.]+)/);
  const rsiM = block.match(/rsi:\s*([\d.]+)/);
  const dropM = block.match(/dropFromPeak:\s*([\d.]+)/);
  const volM = block.match(/recentVolatility:\s*([\d.]+)/);
  const spikeM = block.match(/volumeSpike:\s*([\d.]+)/);
  if (vixM) vixVals.push(parseFloat(vixM[1]));
  if (rsiM) rsiVals.push(parseFloat(rsiM[1]));
  if (dropM) dropVals.push(parseFloat(dropM[1]));
  if (volM) volVals.push(parseFloat(volM[1]));
  if (spikeM) volSpikeVals.push(parseFloat(spikeM[1]));
}

console.log(`Total events parsed: ${vixVals.length}\n`);

// 1. Basic stats
function stats(arr: number[], label: string) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
  const unique = new Set(arr).size;
  console.log(
    `${label}: min=${sorted[0]} max=${sorted[sorted.length-1]} mean=${mean} unique=${unique}/${arr.length}`
  );
}
stats(vixVals, "VIX  ");
stats(rsiVals, "RSI  ");
stats(dropVals, "Drop%");
stats(volVals, "Vol  ");
stats(volSpikeVals, "Spike");

// 2. Check for repeated (fabricated) values
console.log("\n=== Duplicated VIX values (sign of AI fabrication) ===");
const vixFreq: Record<number, number> = {};
vixVals.forEach((v) => (vixFreq[v] = (vixFreq[v] || 0) + 1));
Object.entries(vixFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([v, c]) => console.log(`  VIX=${v}: ${c} times`));

console.log("\n=== Duplicated RSI values ===");
const rsiFreq: Record<number, number> = {};
rsiVals.forEach((v) => (rsiFreq[v] = (rsiFreq[v] || 0) + 1));
Object.entries(rsiFreq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([v, c]) => console.log(`  RSI=${v}: ${c} times`));

// 3. Check return values for fabrication
console.log("\n=== Return value patterns ===");
const retRegex = /oneMonthReturn:\s*([\d.-]+),\s*\n\s*threeMonthReturn:\s*([\d.-]+)/g;
const returns: [number, number][] = [];
while ((match = retRegex.exec(code)) !== null) {
  returns.push([parseFloat(match[1]), parseFloat(match[2])]);
}
console.log(`Total return pairs: ${returns.length}`);

// Check for suspiciously similar returns (AI often uses template values)
const ret1m = returns.map((r) => r[0]);
const ret3m = returns.map((r) => r[1]);
stats(ret1m, "1M Ret");
stats(ret3m, "3M Ret");

// Check for common template values
const common1m = [3.5, 4.5, 5.2, 5.5, 5.8, 6.5, 7.5, 8.5];
const matchTemplate = ret1m.filter((r) => common1m.includes(r));
console.log(`\n1M returns matching template values (${common1m.join(",")}): ${matchTemplate.length}/${ret1m.length}`);

// 4. Cross-reference a few events with real data
console.log("\n=== Spot-check: VIX vs real historical data ===");
// Well-known events and their actual VIX:
const referenceVIX: Record<string, number> = {
  "2008-09-15": 31.7,  // Lehman
  "2020-02-24": 25.0,  // COVID start
  "2011-08-08": 48.0,  // US downgrade (actual was ~48!)
  "1998-09-23": 43.0,  // LTCM
  "2018-12-24": 36.1,  // Christmas Eve
  "2016-06-24": 25.8,  // Brexit
};

const dateRegex = /date:\s*"([^"]+)"/g;
const eventDates: string[] = [];
while ((match = dateRegex.exec(code)) !== null) {
  eventDates.push(match[1]);
}

// Find events near reference dates
for (const [refDate, expectedVix] of Object.entries(referenceVIX)) {
  const idx = eventDates.indexOf(refDate);
  if (idx >= 0 && idx < vixVals.length) {
    const actual = vixVals[idx];
    const diff = Math.abs(actual - expectedVix);
    const mark = diff <= 2 ? "✅" : diff <= 5 ? "⚠️" : "❌";
    console.log(`  ${mark} ${refDate}: expected VIX~${expectedVix}, got ${actual} (diff=${diff.toFixed(1)})`);
  }
}

// 5. Check for "generic" non-specific VIX values (e.g. too many round numbers)
const roundVIX = vixVals.filter(v => v === Math.round(v) && v > 15);
console.log(`\nRound-number VIX: ${roundVIX.length}/${vixVals.length} (${(roundVIX.length/vixVals.length*100).toFixed(0)}%)`);

const genericRSI = rsiVals.filter(r => [30, 35, 38, 40, 42, 45, 48, 50].includes(r));
console.log(`Generic/mid-range RSI (30-50 common values): ${genericRSI.length}/${rsiVals.length}`);
