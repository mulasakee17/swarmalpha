/**
 * Minimal one-off fork core for the neutral/labeled mechanism experiment.
 * No provider, task resolver, persistence, or generic runner abstraction lives
 * here. The sole responsibility is independent arm snapshots and treatment
 * identity enforcement.
 */

import { createHash } from "node:crypto";
import {
  MECHANISM_ARMS,
  assertMechanismDisclosureTripleV1,
  assertMechanismOnlinePayloadTruthBlindV1,
  buildMechanismDisclosureArtifactsV1,
  type MechanismArmV1,
  type MechanismAttackItemV1,
  type MechanismDisclosureArtifactV1,
} from "./mechanismDisclosureContractV1";

export const MECHANISM_FORK_CORE_REF = Object.freeze({
  id: "swarmalpha.experiment.v6.mechanism-fork-core",
  version: "1.0.0",
});

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("mechanism_snapshot_non_finite_number");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object") throw new Error("mechanism_snapshot_not_json");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("mechanism_snapshot_not_plain_json");
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonicalize((value as Record<string, unknown>)[key])]));
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function computeMechanismSnapshotHashV1(snapshot: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(snapshot), "utf8").digest("hex")}`;
}

function deserializeAndFreeze<T>(canonical: string): Readonly<T> {
  const value = JSON.parse(canonical) as T;
  const freeze = (item: unknown): void => {
    if (item === null || typeof item !== "object" || Object.isFrozen(item)) return;
    for (const child of Object.values(item as Record<string, unknown>)) freeze(child);
    Object.freeze(item);
  };
  freeze(value);
  return value;
}

function assertArmOrder(order: readonly MechanismArmV1[]): void {
  if (order.length !== MECHANISM_ARMS.length
    || new Set(order).size !== MECHANISM_ARMS.length
    || MECHANISM_ARMS.some(arm => !order.includes(arm))) {
    throw new Error("mechanism_arm_order_not_permutation");
  }
}

export interface MechanismArmExecutionInputV1<Snapshot> {
  arm: MechanismArmV1;
  /** Independently deserialized and recursively frozen for this arm. */
  round1Snapshot: Readonly<Snapshot>;
  sharedSnapshotHash: string;
  disclosure: Readonly<MechanismDisclosureArtifactV1>;
}

export interface MechanismForkExecutionV1<Result> {
  sharedSnapshotHash: string;
  armOrder: MechanismArmV1[];
  arms: Array<{
    arm: MechanismArmV1;
    treatmentHash: string;
    selectionIdentityHash: string;
    disclosure: MechanismDisclosureArtifactV1;
    result: Result;
  }>;
}

export async function executeMechanismForkCoreV1<Snapshot, Result>(input: {
  round1Snapshot: Snapshot;
  selectedAttackItems: readonly MechanismAttackItemV1[];
  armOrder: readonly MechanismArmV1[];
  executeArm: (armInput: MechanismArmExecutionInputV1<Snapshot>) => Promise<Result>;
}): Promise<MechanismForkExecutionV1<Result>> {
  assertArmOrder(input.armOrder);
  assertMechanismOnlinePayloadTruthBlindV1(input.round1Snapshot);
  const canonicalSnapshot = canonicalJson(input.round1Snapshot);
  const sharedSnapshotHash = computeMechanismSnapshotHashV1(input.round1Snapshot);
  const disclosures = buildMechanismDisclosureArtifactsV1(input.selectedAttackItems);
  assertMechanismDisclosureTripleV1(disclosures);

  const arms: MechanismForkExecutionV1<Result>["arms"] = [];
  for (const arm of input.armOrder) {
    const armSnapshot = deserializeAndFreeze<Snapshot>(canonicalSnapshot);
    const disclosure = deserializeAndFreeze<MechanismDisclosureArtifactV1>(
      canonicalJson(disclosures[arm]),
    );
    const result = await input.executeArm({
      arm,
      round1Snapshot: armSnapshot,
      sharedSnapshotHash,
      disclosure,
    });
    if (computeMechanismSnapshotHashV1(armSnapshot) !== sharedSnapshotHash) {
      throw new Error("mechanism_arm_snapshot_mutated");
    }
    arms.push({
      arm,
      treatmentHash: disclosure.treatmentHash,
      selectionIdentityHash: disclosure.selectionIdentityHash,
      disclosure: structuredClone(disclosure) as MechanismDisclosureArtifactV1,
      result,
    });
  }
  return { sharedSnapshotHash, armOrder: [...input.armOrder], arms };
}
