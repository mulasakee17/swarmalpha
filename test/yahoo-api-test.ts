/**
 * Yahoo Finance API 连通性测试
 * 运行: npx tsx test/yahoo-api-test.ts
 */
import { getSP500Data, getVIXData, clearCache } from "../src/lib/market-data/yahoo";
import { fetchRealMarketParams } from "../src/lib/market-data/realMarketParams";

async function testYahooAPI() {
  console.log("=== Yahoo Finance API 连通性测试 ===\n");

  // Test 1: S&P 500
  console.log("[Test 1] Fetching S&P 500 data...");
  const sp500 = await getSP500Data();
  if (sp500) {
    console.log(`  ✅ S&P 500: ${sp500.closes.length} data points`);
    console.log(`     Latest close: ${sp500.closes[sp500.closes.length - 1].toFixed(2)}`);
    console.log(`     Date range: ${new Date(sp500.timestamps[0] * 1000).toISOString().slice(0, 10)} → ${new Date(sp500.timestamps[sp500.timestamps.length - 1] * 1000).toISOString().slice(0, 10)}`);
  } else {
    console.log("  ❌ Failed to fetch S&P 500 data");
  }

  clearCache();

  // Test 2: VIX
  console.log("\n[Test 2] Fetching VIX data...");
  const vix = await getVIXData();
  if (vix) {
    console.log(`  ✅ VIX: ${vix.closes.length} data points`);
    console.log(`     Latest close: ${vix.closes[vix.closes.length - 1].toFixed(2)}`);
  } else {
    console.log("  ❌ Failed to fetch VIX data");
  }

  clearCache();

  // Test 3: Full market params
  console.log("\n[Test 3] Computing market params from real data...");
  const params = await fetchRealMarketParams("Fed announces emergency rate cut of 50bp amid market turmoil");
  if (params) {
    console.log(`  ✅ Market params (${params.dataSource}):`);
    console.log(`     VIX: ${params.vix}`);
    console.log(`     RSI: ${params.rsi}`);
    console.log(`     Drop from peak: ${params.dropMagnitude}%`);
    console.log(`     Volatility: ${(params.volatility * 100).toFixed(2)}% daily`);
    console.log(`     Has policy response: ${params.hasPolicyResponse}`);
    console.log(`     Has CB action: ${params.hasCentralBankAction}`);
    console.log(`     Vulnerabilities: ${params.knownVulnerabilities.join(", ") || "none"}`);
  } else {
    console.log("  ❌ Failed to compute market params");
    console.log("  (This is expected if Yahoo Finance is unreachable — will fall back to inference)");
  }

  console.log("\n=== Test complete ===");
}

testYahooAPI().catch(console.error);
