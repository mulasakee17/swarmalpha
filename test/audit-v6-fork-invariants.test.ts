/** Red-team invariants for the V6 fork.  Zero network; never touches artifacts. */
import { describe, expect, it } from "vitest";
import { runFork } from "../experiments/campaign/v6/run_v6_fork";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import type { SingleAttemptTextInvoker, SingleAttemptTextInvokeRequest } from "../experiments/campaign/v6/providerAdapters";

const TASK_ID = 15;
const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: TASK_ID }).adapter.task;
const options = task.claim.options;

function probabilities(agent: number): Record<string, number> {
  const rest = 0.1 / (options.length - 1);
  return Object.fromEntries(options.map((option, index) => [option, index === agent % options.length ? 0.9 : rest]));
}

function agentIndex(requestId: string): number {
  return Number(/agent:hiddenbench:\d+:(\d+)/.exec(requestId)?.[1] ?? "1") - 1;
}

function phase(requestId: string): "r1" | "r2" | "final" {
  if (requestId.startsWith("final:")) return "final";
  return requestId.includes(":r1:") ? "r1" : "r2";
}

function arm(requestId: string): string {
  return /:(CONTROL|SUPPORTS|ATTACKS):/.exec(requestId)?.[1] ?? "NONE";
}

function capturingInvoker(r2Variant: "forward" | "reverse"):
  SingleAttemptTextInvoker & { requests: SingleAttemptTextInvokeRequest[] } {
  const requests: SingleAttemptTextInvokeRequest[] = [];
  return {
    requests,
    async invoke(request) {
      requests.push(structuredClone(request));
      const index = agentIndex(request.requestId);
      const currentPhase = phase(request.requestId);
      if (currentPhase === "final") {
        const finalProbabilities = Object.fromEntries(options.map((option, optionIndex) => [
          option,
          optionIndex === 0 ? 0.712345 : optionIndex === 1 ? 0.187655 : optionIndex === 2 ? 0.1 : 0,
        ]));
        return {
          rawContent: JSON.stringify({
            status: "answered",
            reports: [{
              claimId: task.claim.id,
              value: { kind: "categorical", probabilities: finalProbabilities },
            }],
          }),
        };
      }
      const messageIndex = currentPhase === "r2" && r2Variant === "reverse"
        ? task.agents.length - 1 - index
        : index;
      return {
        rawContent: JSON.stringify({
          message: `AUDIT_${currentPhase}_${arm(request.requestId)}_MESSAGE_${messageIndex}`,
          belief: { kind: "categorical", probabilities: probabilities(index) },
          evidence: [{ content: `AUDIT_${currentPhase}_${arm(request.requestId)}_EVIDENCE_${messageIndex}`, relation: "supports" }],
        }),
      };
    },
  };
}

describe("audit: same-round simultaneity and fork isolation", () => {
  it("ten-task outbound-request sample excludes answer-key field names", async () => {
    const sampledTaskIds = [14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    const requests: SingleAttemptTextInvokeRequest[] = [];
    const invoker: SingleAttemptTextInvoker = {
      async invoke(request) {
        requests.push(structuredClone(request));
        const taskId = Number(/task-(\d+)/.exec(request.requestId)?.[1]);
        const currentTask = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task;
        const ps = Object.fromEntries(currentTask.claim.options.map((option, index) => [option, index === 0 ? 1 : 0]));
        return request.requestId.startsWith("final:")
          ? { rawContent: JSON.stringify({ status: "answered", reports: [{ claimId: currentTask.claim.id, value: { kind: "categorical", probabilities: ps } }] }) }
          : { rawContent: JSON.stringify({ message: `TASK_${taskId}`, belief: { kind: "categorical", probabilities: ps }, evidence: [] }) };
      },
    };
    for (const taskId of sampledTaskIds) {
      await runFork({ taskId, seed: 0, model: "audit:mock", invoker });
    }
    expect(requests.length).toBeGreaterThan(200);
    for (const request of requests) {
      expect(JSON.stringify(request)).not.toMatch(/groundTruth|correctAnswer|correct_answer|resolvedOption|\"rationale\"/);
    }
  });

  it("outbound requests contain no forbidden ground-truth field names", async () => {
    const invoker = capturingInvoker("forward");
    await runFork({ taskId: TASK_ID, seed: 0, model: "audit:mock", invoker });
    for (const request of invoker.requests) {
      const serialized = JSON.stringify(request);
      expect(serialized).not.toMatch(/groundTruth|correctAnswer|correct_answer|resolvedOption/);
    }
    expect(new Set(invoker.requests.map(request => request.invocationConfig.seed))).toEqual(new Set([118785]));
  });

  it("R1 and same-arm R2 prompts are invariant to earlier same-round outputs", async () => {
    const forward = capturingInvoker("forward");
    const reverse = capturingInvoker("reverse");
    await runFork({ taskId: TASK_ID, seed: 0, model: "audit:mock", invoker: forward });
    await runFork({ taskId: TASK_ID, seed: 0, model: "audit:mock", invoker: reverse });

    const requestsOf = (invoker: typeof forward, target: "r1" | "r2") => invoker.requests
      .filter(request => phase(request.requestId) === target)
      .map(request => ({ requestId: request.requestId, systemPrompt: request.systemPrompt, userPrompt: request.userPrompt }));
    expect(requestsOf(forward, "r1")).toEqual(requestsOf(reverse, "r1"));
    expect(requestsOf(forward, "r2")).toEqual(requestsOf(reverse, "r2"));

    for (const request of forward.requests.filter(request => phase(request.requestId) === "r1")) {
      expect(request.userPrompt).not.toContain("AUDIT_r1_");
    }
    for (const request of forward.requests.filter(request => phase(request.requestId) === "r2")) {
      expect(request.userPrompt).not.toContain("AUDIT_r2_");
    }
  });

  it("final prompts see all R2 messages but never earlier same-round final outputs", async () => {
    const invoker = capturingInvoker("forward");
    await runFork({ taskId: TASK_ID, seed: 0, model: "audit:mock", invoker });
    for (const treatment of ["CONTROL", "SUPPORTS", "ATTACKS"]) {
      const finals = invoker.requests.filter(request => phase(request.requestId) === "final" && arm(request.requestId) === treatment);
      expect(finals).toHaveLength(task.agents.length);
      for (const request of finals) {
        expect(request.userPrompt).not.toContain("0.712345");
        for (let agent = 0; agent < task.agents.length; agent++) {
          expect(request.userPrompt).toContain(`AUDIT_r2_${treatment}_MESSAGE_${agent}`);
        }
      }
    }
  });

  it("demonstrates that returned fork rows share mutable nested round-1 objects", async () => {
    const invoker = capturingInvoker("forward");
    const rows = await runFork({ taskId: TASK_ID, seed: 0, model: "audit:mock", invoker });
    expect(rows).toHaveLength(3);
    const original = rows[1].round1AgentBeliefs[0][options[0]];
    rows[0].round1AgentBeliefs[0][options[0]] = 0.123456789;
    expect(rows[1].round1AgentBeliefs[0][options[0]]).toBe(0.123456789);
    expect(rows[1].round1AgentBeliefs[0][options[0]]).not.toBe(original);

    const evidenceOriginal = rows[2].round1EvidenceContents[0][0];
    rows[0].round1EvidenceContents[0][0] = "AUDIT_MUTATION";
    expect(rows[2].round1EvidenceContents[0][0]).toBe("AUDIT_MUTATION");
    expect(rows[2].round1EvidenceContents[0][0]).not.toBe(evidenceOriginal);
  });

  it("task execution order does not alter another task's outbound prompts", async () => {
    const taskAwareInvoker = (): SingleAttemptTextInvoker & { requests: SingleAttemptTextInvokeRequest[] } => {
      const requests: SingleAttemptTextInvokeRequest[] = [];
      return {
        requests,
        async invoke(request) {
          requests.push(structuredClone(request));
          const taskId = Number(/task-(\d+)/.exec(request.requestId)?.[1]);
          const currentTask = createHiddenBenchTaskProjectionV1({ sourceTaskId: taskId }).adapter.task;
          const ps = Object.fromEntries(currentTask.claim.options.map((option, index) => [option, index === 0 ? 1 : 0]));
          return request.requestId.startsWith("final:")
            ? { rawContent: JSON.stringify({ status: "answered", reports: [{ claimId: currentTask.claim.id, value: { kind: "categorical", probabilities: ps } }] }) }
            : { rawContent: JSON.stringify({ message: `TASK_${taskId}`, belief: { kind: "categorical", probabilities: ps }, evidence: [] }) };
        },
      };
    };
    const only15 = taskAwareInvoker();
    await runFork({ taskId: 15, seed: 0, model: "audit:mock", invoker: only15 });
    const after14 = taskAwareInvoker();
    await runFork({ taskId: 14, seed: 0, model: "audit:mock", invoker: after14 });
    await runFork({ taskId: 15, seed: 0, model: "audit:mock", invoker: after14 });
    const before14 = taskAwareInvoker();
    await runFork({ taskId: 15, seed: 0, model: "audit:mock", invoker: before14 });
    await runFork({ taskId: 14, seed: 0, model: "audit:mock", invoker: before14 });
    const forTask = (requests: SingleAttemptTextInvokeRequest[], id: number) => requests
      .filter(request => request.requestId.includes(`task-${id}:`))
      .map(request => ({ requestId: request.requestId, systemPrompt: request.systemPrompt, userPrompt: request.userPrompt, invocationConfig: request.invocationConfig }));
    expect(forTask(after14.requests, 15)).toEqual(forTask(only15.requests, 15));
    expect(forTask(before14.requests, 15)).toEqual(forTask(only15.requests, 15));
  });
});
