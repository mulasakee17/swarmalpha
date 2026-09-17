/**
 * Red-team corruption matrix against a copy of the completed GLM seed-0 run.
 * Formal artifacts are read-only.  Each mutation gets an isolated temp copy.
 */
import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  recomputeGlm46vManifestHash,
  verifyGlm46vTwoArmOutput,
} from "../experiments/campaign/v6/run_v6_fork_glm46v_two_arm_v4";

const BASE = path.resolve("experiments/campaign/pilot_output/v6-fork-glm46v-twoarm-v4-20260820");
const OUTPUT = path.resolve("experiments/campaign/audit/output/corruption_matrix.json");
const results: Array<{ name: string; expectedVerifierOk: boolean; actualVerifierOk: boolean; detail: string }> = [];

function sha(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function copyBase(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "swarmalpha-corruption-"));
  cpSync(BASE, dir, { recursive: true });
  return dir;
}

function manifestOf(dir: string): any {
  return JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
}

function writeManifest(dir: string, manifest: any): void {
  manifest.contentHash = recomputeGlm46vManifestHash(manifest);
  writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function mutateFirstRun(dir: string, mutation: (rows: any[], manifest: any, fileRecord: any) => void): void {
  const manifest = manifestOf(dir);
  const fileRecord = manifest.files[0];
  const target = path.join(dir, fileRecord.fileName);
  const rows = readFileSync(target, "utf8").trim().split("\n").map(line => JSON.parse(line));
  mutation(rows, manifest, fileRecord);
  const text = `${rows.map(row => JSON.stringify(row)).join("\n")}\n`;
  writeFileSync(target, text);
  fileRecord.contentHash = sha(text);
  writeManifest(dir, manifest);
}

function mutateLedger(dir: string, mutation: (events: any[]) => void): void {
  const target = path.join(dir, "attempts.jsonl");
  const events = readFileSync(target, "utf8").trim().split("\n").map(line => JSON.parse(line));
  mutation(events);
  const text = `${events.map(event => JSON.stringify(event)).join("\n")}\n`;
  writeFileSync(target, text);
  const manifest = manifestOf(dir);
  manifest.ledgerHash = sha(text);
  writeManifest(dir, manifest);
}

function runCase(name: string, expectedVerifierOk: boolean, mutation: (dir: string) => void): void {
  const dir = copyBase();
  try {
    mutation(dir);
    const observed = verifyGlm46vTwoArmOutput(dir);
    results.push({ name, expectedVerifierOk, actualVerifierOk: observed.ok, detail: observed.detail });
    expect(observed.ok, observed.detail).toBe(expectedVerifierOk);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

afterAll(() => {
  writeFileSync(OUTPUT, `${JSON.stringify({
    base: path.relative(process.cwd(), BASE),
    interpretation: "Every injected semantic corruption is scientifically expected to FAIL. PASS means a verifier gap.",
    cases: results.map(result => ({
      name: result.name,
      scientificExpected: "FAIL",
      actual: result.actualVerifierOk ? "PASS" : "FAIL",
      verifierDetail: result.detail,
    })),
  }, null, 2)}\n`);
});

describe("audit: GLM verifier adversarial corruption matrix", () => {
  it("baseline verifies", () => expect(verifyGlm46vTwoArmOutput(BASE)).toEqual({ ok: true, detail: "verified" }));

  it("01 rejects a missing registered run file", () => runCase("missing_run_file", false, dir => {
    const manifest = manifestOf(dir);
    unlinkSync(path.join(dir, manifest.files[0].fileName));
  }));

  it("02 rejects an unregistered run file", () => runCase("extra_run_file", false, dir => {
    writeFileSync(path.join(dir, "run_unregistered.jsonl"), "{}\n");
  }));

  it("03 rejects finalBrier-only tampering", () => runCase("final_brier_only", false, dir => {
    mutateFirstRun(dir, rows => { rows[0].finalBrier = 0; });
  }));

  it("04 rejects task/file mismatch", () => runCase("task_file_mismatch", false, dir => {
    mutateFirstRun(dir, rows => { rows[0].taskId += 1; });
  }));

  it("05 rejects duplicate arm membership", () => runCase("duplicate_arm", false, dir => {
    mutateFirstRun(dir, rows => { rows[1].arm = rows[0].arm; });
  }));

  it("06 rejects wrong resolved option", () => runCase("wrong_resolved_option", false, dir => {
    mutateFirstRun(dir, rows => { rows[0].resolvedOption = "AUDIT_WRONG"; });
  }));

  it("07 rejects non-finite-equivalent/null pooled probability", () => runCase("null_probability", false, dir => {
    mutateFirstRun(dir, rows => { rows[0].finalBelief[Object.keys(rows[0].finalBelief)[0]] = null; });
  }));

  it("08 rejects final report count mismatch", () => runCase("final_count_mismatch", false, dir => {
    mutateFirstRun(dir, rows => { rows[0].finalReportedCount += 1; });
  }));

  it("09 rejects raw response mutation without matching raw hash", () => runCase("raw_without_hash", false, dir => {
    mutateFirstRun(dir, rows => { rows[0].finalRawResponses[0].rawResponse = "AUDIT_CORRUPTED"; });
  }));

  it("10 rejects manifest-plan binding corruption", () => runCase("manifest_plan_hash", false, dir => {
    const manifest = manifestOf(dir);
    manifest.planHash = `sha256:${"0".repeat(64)}`;
    writeManifest(dir, manifest);
  }));

  it("11 ACCEPTS swapping row treatment labels while call/raw arms remain unchanged", () => runCase("swap_row_arm_labels", true, dir => {
    mutateFirstRun(dir, rows => { [rows[0].arm, rows[1].arm] = [rows[1].arm, rows[0].arm]; });
  }));

  it("12 ACCEPTS replacing both round1StateHash values", () => runCase("replace_round1_state_hash", true, dir => {
    mutateFirstRun(dir, rows => { for (const row of rows) row.round1StateHash = "AUDIT_NOT_A_HASH"; });
  }));

  it("13 ACCEPTS replacing forkInputHash when manifest record is synchronized", () => runCase("replace_fork_input_hash", true, dir => {
    mutateFirstRun(dir, (rows, _manifest, record) => {
      for (const row of rows) row.forkInputHashV1 = "AUDIT_NOT_A_HASH";
      record.forkInputHashV1 = "AUDIT_NOT_A_HASH";
    });
  }));

  it("14 ACCEPTS arbitrary disclosure diagnostics and contents", () => runCase("forge_disclosure_fields", true, dir => {
    mutateFirstRun(dir, rows => {
      rows[1].disclosedEvidenceCount = 999;
      rows[1].disclosedPoolSize = 999;
      rows[1].round2EvidenceContents = [["AUDIT_FORGED_DISCLOSURE"]];
    });
  }));

  it("15 ACCEPTS arbitrary per-row request hashes", () => runCase("forge_row_request_hash", true, dir => {
    mutateFirstRun(dir, rows => { rows[0].callRecords[0].requestHash = "AUDIT_NOT_A_HASH"; });
  }));

  it("16 ACCEPTS injected duplicate provider request IDs after ledger rehash", () => runCase("duplicate_provider_request_id", true, dir => {
    mutateLedger(dir, events => {
      const finished = events.filter(event => event.type === "attempt_finished");
      finished[0].providerRequestId = "AUDIT_DUPLICATE_PROVIDER_ID";
      finished[1].providerRequestId = "AUDIT_DUPLICATE_PROVIDER_ID";
    });
  }));

  it("17 ACCEPTS injected wrong provider model after ledger rehash", () => runCase("wrong_provider_model", true, dir => {
    mutateLedger(dir, events => {
      events.find(event => event.type === "attempt_finished").providerModel = "audit:not-glm";
    });
  }));

  it("18 ACCEPTS non-JSON raw final when its row hash is synchronized", () => runCase("raw_decoupled_from_belief", true, dir => {
    mutateFirstRun(dir, rows => {
      const raw = rows[0].finalRawResponses[0];
      raw.rawResponse = "AUDIT_NOT_JSON";
      const record = rows[0].callRecords.find((candidate: any) =>
        candidate.phase === "final" && candidate.arm === raw.arm && candidate.agentId === raw.agentId);
      record.rawResponseHash = sha(raw.rawResponse);
    });
  }));
});
