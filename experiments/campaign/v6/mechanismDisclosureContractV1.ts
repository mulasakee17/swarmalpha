/**
 * Zero-provider contract for the first-paper neutral/labeled mechanism probe.
 *
 * This module deliberately does not execute a provider, resolve a task, or
 * modify the frozen V6 fork. It turns one already-selected attack bundle into
 * three auditable arm payloads and provides fail-closed identity assertions for
 * the future isolated mechanism runner.
 */

import { createHash } from "node:crypto";
import type { DisclosedEvidenceItemV1 } from "./crossEvidenceExchangeSelectorsV1";

export const MECHANISM_DISCLOSURE_CONTRACT_REF = Object.freeze({
  id: "swarmalpha.experiment.v6.mechanism-disclosure-contract",
  version: "1.0.0",
});

export const MECHANISM_ARMS = ["CONTROL", "ATTACKS_NEUTRAL", "ATTACKS_LABELED"] as const;
export type MechanismArmV1 = typeof MECHANISM_ARMS[number];
export type MechanismFrameV1 = "none" | "neutral" | "labeled";

/** The selector output accepted by this contract must be attack evidence. */
export type MechanismAttackItemV1 = Omit<DisclosedEvidenceItemV1, "relation">;

export interface MechanismDisclosureArtifactV1 {
  arm: MechanismArmV1;
  frame: MechanismFrameV1;
  /** Shared hash of the selected evidence, including exact text and source order. */
  selectionIdentityHash: string;
  /** Hash of arm + frame + selection identity; used as the treatment commitment. */
  treatmentHash: string;
  /** Exact renderer output commitment; null for CONTROL. */
  messageHash: string | null;
  itemCount: number;
  message: string | null;
  messageCharCount: number;
  items: MechanismAttackItemV1[];
}

function sha256Text(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

/**
 * JSON is intentionally assembled in a fixed field order. The selector already
 * sorts items by content hash and preserves roster order inside sourceAgentIds;
 * the explicit representation makes that ordering part of the commitment.
 */
function canonicalItems(items: readonly MechanismAttackItemV1[]): string {
  return JSON.stringify(items.map(item => ({
    sourceAgentIds: [...item.sourceAgentIds],
    content: item.content,
    contentHash: item.contentHash,
  })));
}

export function computeMechanismSelectionIdentityHashV1(
  items: readonly MechanismAttackItemV1[],
): string {
  return sha256Text(JSON.stringify({
    contract: MECHANISM_DISCLOSURE_CONTRACT_REF,
    selector: "selectAllEvidenceV1:attacks",
    items: JSON.parse(canonicalItems(items)),
  }));
}

export function buildMechanismDisclosureMessageV1(
  frame: Exclude<MechanismFrameV1, "none">,
  items: readonly MechanismAttackItemV1[],
): string {
  const header = frame === "neutral"
    ? "[Experiment-authorized evidence disclosure]"
    : "[Experiment-authorized disconfirming evidence disclosure]";
  const relationText = frame === "neutral"
    ? "recorded evidence"
    : "attacks (disconfirms an option; agent-reported relation)";
  const lines = [
    header,
    "status: recorded input; not a correctness certificate",
  ];
  for (const item of items) {
    lines.push(`- sourceAgentId: ${item.sourceAgentIds.join(", ")}; relation: ${relationText}; contentHash: ${item.contentHash}`);
    lines.push(`  observation: ${item.content}`);
  }
  return lines.join("\n");
}

export function computeMechanismTreatmentHashV1(
  arm: MechanismArmV1,
  frame: MechanismFrameV1,
  selectionIdentityHash: string,
  message: string | null,
): string {
  return sha256Text(JSON.stringify({
    contract: MECHANISM_DISCLOSURE_CONTRACT_REF,
    arm,
    frame,
    selectionIdentityHash,
    message,
  }));
}

function artifact(
  arm: MechanismArmV1,
  frame: MechanismFrameV1,
  items: readonly MechanismAttackItemV1[],
  selectionIdentityHash: string,
): MechanismDisclosureArtifactV1 {
  const message = frame === "none" ? null : buildMechanismDisclosureMessageV1(frame, items);
  return {
    arm,
    frame,
    selectionIdentityHash,
    treatmentHash: computeMechanismTreatmentHashV1(arm, frame, selectionIdentityHash, message),
    messageHash: message === null ? null : sha256Text(message),
    itemCount: items.length,
    message,
    messageCharCount: message?.length ?? 0,
    items: structuredClone(items) as MechanismAttackItemV1[],
  };
}

/**
 * Build the three arm payloads from one frozen attack selection. No resolver or
 * correctness field is accepted by the input type.
 */
export function buildMechanismDisclosureArtifactsV1(
  selectedAttackItems: readonly MechanismAttackItemV1[],
): Record<MechanismArmV1, MechanismDisclosureArtifactV1> {
  const items = structuredClone(selectedAttackItems);
  const selectionIdentityHash = computeMechanismSelectionIdentityHashV1(items);
  return {
    CONTROL: artifact("CONTROL", "none", [], selectionIdentityHash),
    ATTACKS_NEUTRAL: artifact("ATTACKS_NEUTRAL", "neutral", items, selectionIdentityHash),
    ATTACKS_LABELED: artifact("ATTACKS_LABELED", "labeled", items, selectionIdentityHash),
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Fail-closed assertion for the single-variable mechanism contrast. This is
 * intended to run before a request is sent and again in the offline verifier.
 */
export function assertMechanismDisclosureTripleV1(
  artifacts: Record<MechanismArmV1, MechanismDisclosureArtifactV1>,
): void {
  const control = artifacts.CONTROL;
  const neutral = artifacts.ATTACKS_NEUTRAL;
  const labeled = artifacts.ATTACKS_LABELED;
  if (control.arm !== "CONTROL" || control.frame !== "none" || control.message !== null) {
    throw new Error("mechanism_control_payload_invalid");
  }
  if (control.itemCount !== 0 || control.items.length !== 0 || control.messageCharCount !== 0) {
    throw new Error("mechanism_control_disclosure_not_empty");
  }
  if (control.messageHash !== null) throw new Error("mechanism_control_message_hash_invalid");
  if (neutral.arm !== "ATTACKS_NEUTRAL" || neutral.frame !== "neutral" || !neutral.message) {
    throw new Error("mechanism_neutral_payload_invalid");
  }
  if (labeled.arm !== "ATTACKS_LABELED" || labeled.frame !== "labeled" || !labeled.message) {
    throw new Error("mechanism_labeled_payload_invalid");
  }
  const selectionHashes = new Set([
    control.selectionIdentityHash,
    neutral.selectionIdentityHash,
    labeled.selectionIdentityHash,
  ]);
  if (selectionHashes.size !== 1) throw new Error("mechanism_selection_identity_mismatch");
  if (neutral.itemCount !== labeled.itemCount || !sameJson(neutral.items, labeled.items)) {
    throw new Error("mechanism_neutral_labeled_items_mismatch");
  }
  if (neutral.itemCount !== neutral.items.length || labeled.itemCount !== labeled.items.length) {
    throw new Error("mechanism_item_count_mismatch");
  }
  if (neutral.selectionIdentityHash !== computeMechanismSelectionIdentityHashV1(neutral.items)) {
    throw new Error("mechanism_neutral_selection_hash_invalid");
  }
  if (labeled.selectionIdentityHash !== computeMechanismSelectionIdentityHashV1(labeled.items)) {
    throw new Error("mechanism_labeled_selection_hash_invalid");
  }
  if (neutral.message !== buildMechanismDisclosureMessageV1("neutral", neutral.items)) {
    throw new Error("mechanism_neutral_message_not_canonical");
  }
  if (labeled.message !== buildMechanismDisclosureMessageV1("labeled", labeled.items)) {
    throw new Error("mechanism_labeled_message_not_canonical");
  }
  if (neutral.messageCharCount !== neutral.message.length || labeled.messageCharCount !== labeled.message.length) {
    throw new Error("mechanism_message_length_mismatch");
  }
  if (neutral.messageHash !== sha256Text(neutral.message) || labeled.messageHash !== sha256Text(labeled.message)) {
    throw new Error("mechanism_message_hash_invalid");
  }
  if (control.treatmentHash !== computeMechanismTreatmentHashV1(
    control.arm, control.frame, control.selectionIdentityHash, control.message,
  ) || neutral.treatmentHash !== computeMechanismTreatmentHashV1(
    neutral.arm, neutral.frame, neutral.selectionIdentityHash, neutral.message,
  ) || labeled.treatmentHash !== computeMechanismTreatmentHashV1(
    labeled.arm, labeled.frame, labeled.selectionIdentityHash, labeled.message,
  )) {
    throw new Error("mechanism_treatment_hash_invalid");
  }
  if (neutral.treatmentHash === labeled.treatmentHash) {
    throw new Error("mechanism_treatment_hash_not_distinct");
  }
  if (!neutral.message.includes("relation: recorded evidence")) {
    throw new Error("mechanism_neutral_frame_missing");
  }
  if (neutral.message.includes("relation: attacks")) {
    throw new Error("mechanism_neutral_frame_directional");
  }
  if (!labeled.message.includes("relation: attacks (disconfirms an option; agent-reported relation)")) {
    throw new Error("mechanism_labeled_frame_missing");
  }
  if (!labeled.message.includes("not a correctness certificate")) {
    throw new Error("mechanism_labeled_disclaimer_missing");
  }
}

/** Runtime payload guard: offline correctness must never cross this boundary. */
export function assertMechanismOnlinePayloadTruthBlindV1(payload: unknown): void {
  const serialized = JSON.stringify(payload);
  if (/groundTruth|correctAnswer|correct_answer|resolvedOption|proposalCorrectness/i.test(serialized)) {
    throw new Error("mechanism_online_truth_leak");
  }
}
