/** Standalone offline replay tool; imports existing frozen readers, never historical execution. */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, openSync, fsyncSync, closeSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { assertMechanismTaskArtifactV1, type MechanismTaskArtifactV1 } from "./v6/mechanismTaskArtifactV1";
import { SEMANTIC_PROBE_VERSION, prepareSemanticProbeCells, probeInputHash, createJevSemanticProbe,
  parseSemanticProbeResponse, compareSemanticProbeResponses, type ProbeResponse } from "../../src/lib/experimentation/semanticProbe";

export async function semanticProbeMain(args: string[]) {
  if (!args.length || args.includes("--help")) {
    console.log("probe:semantic --artifact <complete task.json> --out <new directory> [--execute --max-calls N]\n"
      + "Default: prepare only, zero network. --execute requires TYPESAFE_API_KEY; no retries/resume. No outcome scoring.");
    return;
  }
  const flags = new Map<string, string>(); let execute = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--execute") { if (execute) throw new Error("probe_duplicate_flag"); execute = true; continue; }
    if (!["--artifact", "--out", "--max-calls"].includes(args[i]) || flags.has(args[i])
      || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error("probe_invalid_arguments");
    flags.set(args[i], args[++i]);
  }
  if (!flags.get("--artifact") || !flags.get("--out")) throw new Error("probe_paths_required");
  const source = readFileSync(resolve(flags.get("--artifact")!));
  const artifact = JSON.parse(source.toString("utf8")) as MechanismTaskArtifactV1;
  assertMechanismTaskArtifactV1(artifact);
  const sourceKind = "fixtureKind" in artifact && artifact.fixtureKind === "synthetic-no-network" ? "synthetic" : "recorded";
  const cells = prepareSemanticProbeCells(artifact);
  const maxCalls = Number(flags.get("--max-calls"));
  if (execute && (!Number.isSafeInteger(maxCalls) || maxCalls < cells.length || maxCalls > 24)) {
    throw new Error("probe_explicit_call_cap_required_max_24");
  }
  // Credentials are not touched during preparation. Creating a client does not invoke it.
  const invoke = execute ? createJevSemanticProbe(process.env.TYPESAFE_API_KEY ?? "") : null;
  const out = resolve(flags.get("--out")!);
  mkdirSync(dirname(out), { recursive: true }); mkdirSync(out); // Existing run directory is rejected.
  writeFileSync(join(out, "requests.json"), JSON.stringify({ version: SEMANTIC_PROBE_VERSION,
    artifactHash: createHash("sha256").update(source).digest("hex"), sourceKind, phase: "round2", cells }, null, 2));
  console.log(JSON.stringify({ mode: execute ? "execute" : "prepare", sourceKind, cells: cells.length, out }));
  if (!invoke) return;
  const journal = join(out, "attempts.jsonl");
  function record(event: unknown) {
    appendFileSync(journal, JSON.stringify(event) + "\n");
    const fd = openSync(journal, "r+"); try { fsyncSync(fd); } finally { closeSync(fd); }
  }
  const responses = new Map<string, ProbeResponse>();
  for (const cell of cells) {
    const inputHash = probeInputHash(cell.body);
    record({ id: cell.id, inputHash, status: "started", at: new Date().toISOString() });
    let raw: string;
    try { raw = await invoke(cell, AbortSignal.timeout(30_000)); }
    catch { record({ id: cell.id, inputHash, status: "unknown", at: new Date().toISOString() }); throw new Error("probe_call_failed_no_retry"); }
    let parsed: ProbeResponse;
    try { parsed = parseSemanticProbeResponse(raw, cell.options); }
    catch { record({ id: cell.id, inputHash, status: "invalid", rawResponse: raw }); throw new Error("probe_invalid_response_no_retry"); }
    record({ id: cell.id, inputHash, status: "returned", ...parsed, at: new Date().toISOString() });
    responses.set(cell.id, parsed);
  }
  writeFileSync(join(out, "comparison.json"), JSON.stringify({ version: SEMANTIC_PROBE_VERSION,
    sourceKind,
    interpretation: "external model response difference; not social influence or agent internal belief",
    comparisons: compareSemanticProbeResponses(cells, responses) }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  semanticProbeMain(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
