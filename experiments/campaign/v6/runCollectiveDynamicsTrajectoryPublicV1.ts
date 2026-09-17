/** Provider-neutral 57-call public trajectory runner for M2. */
import {
  buildCollectiveDynamicsTrajectoryPilotPlanV1,
  buildCollectiveDynamicsTrajectoryPublicRequestUncheckedV1,
  verifyCollectiveDynamicsTrajectoryPilotPlanV1,
  type CollectiveDynamicsTrajectoryPilotPlanV1,
} from "./collectiveDynamicsTrajectoryPilotV1";
import {
  buildCollectiveDynamicsTrajectoryPublicArtifactV1,
  verifyCollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicArtifactV1,
  type CollectiveDynamicsTrajectoryPublicCallRefV1,
} from "./collectiveDynamicsTrajectoryCheckpointV1";
import {
  hashCollectiveDynamicsValueV1,
} from "./collectiveDynamicsV1";
import {
  createV6DiscussionAdapter,
  type SingleAttemptTextInvoker,
} from "./providerAdapters";
import { providerFailureCode } from "./providerDiagnostics";
import { createHiddenBenchTaskProjectionV1 } from "./hiddenBenchTaskAdapter";
import { createV6HiddenBenchSmokeFixtureV1 } from "./v6HiddenBenchSmokeFixture";
import type {
  V6DiscussionRequestV1,
  V6ProviderUsage,
  V6PublicTranscriptEntry,
} from "./productionVerticalSlice";
import {
  parseL4StructuredPublicTurnV1,
  type L4StructuredPublicTurnV1,
} from "./discussionThermometerL4PreflightV1";

export const COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_RUN_V1 = Object.freeze({
  id: "swarmalpha.experiment.v6.collective-dynamics-trajectory-public-run",
  version: "1.0.0",
});

export type CollectiveDynamicsTrajectoryPublicTerminalV1 = {
  cellId: string;
  sourceTaskId: number;
  round: 1 | 2 | 3;
  agentId: string;
  request: V6DiscussionRequestV1;
  requestHash: string;
  startedAt: string;
  terminalAt: string;
} & ({
  status: "valid";
  rawResponse: string;
  responseHash: string;
  parsedPublicTurn?: L4StructuredPublicTurnV1;
  usage?: V6ProviderUsage;
} | {
  status: "invalid_response";
  rawResponse?: string;
  responseHash?: string;
  parseFailureCode?: string;
} | {
  status: ReturnType<typeof providerFailureCode>;
});

export interface CollectiveDynamicsTrajectoryPublicRunV1 {
  runRef: typeof COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_RUN_V1;
  planHash: string;
  taskArtifacts: CollectiveDynamicsTrajectoryPublicArtifactV1[];
  terminals: CollectiveDynamicsTrajectoryPublicTerminalV1[];
  registeredCellCount: number;
  terminalCellCount: number;
  providerCallCount: number;
  attemptsPerCell: 1;
  retry: "none";
  contentHash: string;
}

export interface CollectiveDynamicsTrajectoryPublicAttemptStartV1 {
  type: "started";
  cellId: string;
  requestHash: string;
  sequence: number;
  timestamp: string;
}

export interface CollectiveDynamicsTrajectoryPublicAttemptTerminalV1 {
  type: "terminal";
  cellId: string;
  requestHash: string;
  sequence: number;
  status: CollectiveDynamicsTrajectoryPublicTerminalV1["status"];
  timestamp: string;
  terminal: CollectiveDynamicsTrajectoryPublicTerminalV1;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function monotonicClock(clock?: () => string): () => string {
  if (clock) return clock;
  let previous = Number.NEGATIVE_INFINITY;
  return () => {
    const next = Math.max(Date.now(), previous + 1);
    previous = next;
    return new Date(next).toISOString();
  };
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error("trajectory_public_timestamp_invalid");
  }
  return parsed;
}

function adapter(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  sourceTaskId: number;
  invoker: SingleAttemptTextInvoker;
}) {
  const fixture = createV6HiddenBenchSmokeFixtureV1({
    sourceTaskId: input.sourceTaskId,
    profile: "expanded-json-v2",
  });
  return createV6DiscussionAdapter({
    contract: {
      ...clone(fixture.discussionContract),
      agentBindings: fixture.task.agents.map(agent => ({
        agentId: agent.agentId,
        modelRef: clone(input.plan.modelRef),
        invocationConfig: {
          temperature: input.plan.publicInvocation.temperature,
          seed: input.plan.publicInvocation.seed,
          maxTokens: input.plan.publicInvocation.maxTokens,
          thinking: input.plan.publicInvocation.thinking,
        },
      })),
      retryPolicy: "none",
      executionOrder: "round_then_precommitted_agent",
    },
    invoker: input.invoker,
  });
}

export async function executeCollectiveDynamicsTrajectoryPublicV1(input: {
  plan?: CollectiveDynamicsTrajectoryPilotPlanV1;
  invoker: SingleAttemptTextInvoker;
  signal?: AbortSignal;
  clock?: () => string;
  onStart?: (event: CollectiveDynamicsTrajectoryPublicAttemptStartV1) => void;
  onTerminal?: (event: CollectiveDynamicsTrajectoryPublicAttemptTerminalV1) => void;
}): Promise<CollectiveDynamicsTrajectoryPublicRunV1> {
  const plan = input.plan ?? buildCollectiveDynamicsTrajectoryPilotPlanV1();
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  const signal = input.signal ?? new AbortController().signal;
  const clock = monotonicClock(input.clock);
  const terminals: CollectiveDynamicsTrajectoryPublicTerminalV1[] = [];
  const taskArtifacts: CollectiveDynamicsTrajectoryPublicArtifactV1[] = [];
  let sequence = 0;
  let lastTimestamp = Number.NEGATIVE_INFINITY;
  for (const sourceTaskIdValue of plan.sourceTaskIds) {
    const sourceTaskId = sourceTaskIdValue;
    const task = createHiddenBenchTaskProjectionV1({ sourceTaskId }).adapter.task;
    const discussion = adapter({ plan, sourceTaskId, invoker: input.invoker });
    const rounds: Array<{
      round: 1 | 2 | 3;
      messages: V6PublicTranscriptEntry[];
      calls: CollectiveDynamicsTrajectoryPublicCallRefV1[];
    }> = [];
    let previousRoundMessages: V6PublicTranscriptEntry[] = [];
    for (const round of [1, 2, 3] as const) {
      const messages: V6PublicTranscriptEntry[] = [];
      const calls: CollectiveDynamicsTrajectoryPublicCallRefV1[] = [];
      for (const agent of task.agents) {
        sequence += 1;
        const request = buildCollectiveDynamicsTrajectoryPublicRequestUncheckedV1({
          plan,
          sourceTaskId,
          round,
          agentId: agent.agentId,
          previousRoundMessages,
        });
        const requestHash = hashCollectiveDynamicsValueV1(request);
        const cellId = request.requestId;
        const startedAt = clock();
        const startedMillis = timestamp(startedAt);
        if (startedMillis <= lastTimestamp) throw new Error("trajectory_public_clock_not_monotonic");
        lastTimestamp = startedMillis;
        input.onStart?.({ type: "started", cellId, requestHash, sequence, timestamp: startedAt });
        let response: Awaited<ReturnType<typeof discussion.respond>> | undefined;
        let invocationError: unknown;
        try {
          response = await discussion.respond(clone(request), signal);
        } catch (error) {
          invocationError = error;
        }
        const terminalAt = clock();
        const terminalMillis = timestamp(terminalAt);
        if (terminalMillis <= lastTimestamp) throw new Error("trajectory_public_clock_not_monotonic");
        lastTimestamp = terminalMillis;
        let terminal: CollectiveDynamicsTrajectoryPublicTerminalV1;
        if (!response) {
          terminal = {
            cellId, sourceTaskId, round, agentId: agent.agentId,
            request: clone(request), requestHash, startedAt, terminalAt,
            status: providerFailureCode(invocationError),
          };
        } else if (response.status !== "response"
          || typeof response.rawResponse !== "string"
          || response.rawResponse.trim().length === 0) {
          terminal = {
            cellId, sourceTaskId, round, agentId: agent.agentId,
            request: clone(request), requestHash, startedAt, terminalAt,
            status: response.status === "unavailable"
              ? response.diagnosticCode === "adapter_unavailable" ? "provider_error" : response.diagnosticCode
              : "invalid_response",
          };
        } else {
          let parsedPublicTurn: L4StructuredPublicTurnV1 | undefined;
          if (plan.publicResponseContract === "choice_message_json_v1") {
            try {
              parsedPublicTurn = parseL4StructuredPublicTurnV1(
                response.rawResponse,
                task.claim.options?.map((_, index) => `opt_${index + 1}`) ?? [],
              );
            } catch (error) {
              terminal = {
                cellId, sourceTaskId, round, agentId: agent.agentId,
                request: clone(request), requestHash, startedAt, terminalAt,
                status: "invalid_response",
                rawResponse: response.rawResponse,
                responseHash: hashCollectiveDynamicsValueV1(response.rawResponse),
                parseFailureCode: error instanceof Error ? error.message : "l4_public_turn_parse_unknown",
              };
            }
          }
          terminal ??= {
            cellId, sourceTaskId, round, agentId: agent.agentId,
            request: clone(request), requestHash, startedAt, terminalAt,
            status: "valid",
            rawResponse: response.rawResponse,
            responseHash: hashCollectiveDynamicsValueV1(response.rawResponse),
            ...(parsedPublicTurn ? { parsedPublicTurn } : {}),
            ...(response.usage ? { usage: clone(response.usage) } : {}),
          };
          if (terminal.status !== "valid") {
            terminals.push(terminal);
            input.onTerminal?.({
              type: "terminal", cellId, requestHash, sequence, status: terminal.status,
              timestamp: terminalAt, terminal: clone(terminal),
            });
            throw new Error(`trajectory_public_run_halted:${terminal.status}:${cellId}`);
          }
          messages.push({
            round,
            agentId: agent.agentId,
            content: parsedPublicTurn
              ? `[choiceId=${parsedPublicTurn.choiceId}]\n${parsedPublicTurn.message}`
              : response.rawResponse,
            source: "agent",
          });
          calls.push({
            requestId: request.requestId,
            round,
            agentId: agent.agentId,
            requestHash,
            responseHash: terminal.responseHash,
          });
        }
        terminals.push(terminal);
        input.onTerminal?.({
          type: "terminal",
          cellId,
          requestHash,
          sequence,
          status: terminal.status,
          timestamp: terminalAt,
          terminal: clone(terminal),
        });
        if (terminal.status !== "valid") {
          throw new Error(`trajectory_public_run_halted:${terminal.status}:${cellId}`);
        }
      }
      rounds.push({ round, messages, calls });
      previousRoundMessages = clone(messages);
    }
    const artifact = buildCollectiveDynamicsTrajectoryPublicArtifactV1({
      plan,
      sourceTaskId,
      runId: `${plan.runIdPrefix ?? "collective-dynamics-m2"}:${sourceTaskId}:seed-${plan.seed}`,
      rounds: rounds as unknown as Parameters<typeof buildCollectiveDynamicsTrajectoryPublicArtifactV1>[0]["rounds"],
    });
    taskArtifacts.push(artifact);
  }
  const body: Omit<CollectiveDynamicsTrajectoryPublicRunV1, "contentHash"> = {
    runRef: COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_RUN_V1,
    planHash: plan.contentHash,
    taskArtifacts,
    terminals,
    registeredCellCount: plan.publicCallCount,
    terminalCellCount: terminals.length,
    providerCallCount: terminals.length,
    attemptsPerCell: 1,
    retry: "none",
  };
  const artifact = { ...body, contentHash: hashCollectiveDynamicsValueV1(body) };
  verifyCollectiveDynamicsTrajectoryPublicRunV1({ plan, artifact });
  return clone(artifact);
}

export function verifyCollectiveDynamicsTrajectoryPublicRunV1(input: {
  plan: CollectiveDynamicsTrajectoryPilotPlanV1;
  artifact: CollectiveDynamicsTrajectoryPublicRunV1;
}): void {
  const { plan, artifact } = input;
  verifyCollectiveDynamicsTrajectoryPilotPlanV1(plan);
  if (artifact.runRef.id !== COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_RUN_V1.id
    || artifact.runRef.version !== COLLECTIVE_DYNAMICS_TRAJECTORY_PUBLIC_RUN_V1.version
    || artifact.planHash !== plan.contentHash
    || artifact.registeredCellCount !== plan.publicCallCount
    || artifact.terminalCellCount !== plan.publicCallCount
    || artifact.providerCallCount !== plan.publicCallCount
    || artifact.attemptsPerCell !== 1 || artifact.retry !== "none"
    || artifact.taskArtifacts.length !== plan.sourceTaskIds.length
    || artifact.terminals.length !== plan.publicCallCount
    || artifact.terminals.some(terminal => terminal.status !== "valid")) {
    throw new Error("trajectory_public_run_scope_invalid");
  }
  artifact.taskArtifacts.forEach((taskArtifact, index) => {
    if (taskArtifact.onlineTask.sourceTaskId !== plan.sourceTaskIds[index]) {
      throw new Error("trajectory_public_run_task_order_invalid");
    }
    verifyCollectiveDynamicsTrajectoryPublicArtifactV1(taskArtifact, plan);
  });
  const terminalIds = artifact.terminals.map(terminal => terminal.cellId);
  if (new Set(terminalIds).size !== plan.publicCallCount) throw new Error("trajectory_public_run_terminal_set_invalid");
  artifact.terminals.forEach(terminal => {
    if (terminal.requestHash !== hashCollectiveDynamicsValueV1(terminal.request)
      || timestamp(terminal.terminalAt) <= timestamp(terminal.startedAt)
      || terminal.status !== "valid"
      || terminal.responseHash !== hashCollectiveDynamicsValueV1(terminal.rawResponse)) {
      throw new Error("trajectory_public_run_terminal_binding_invalid");
    }
    if (plan.publicResponseContract === "choice_message_json_v1") {
      const task = createHiddenBenchTaskProjectionV1({ sourceTaskId: terminal.sourceTaskId }).adapter.task;
      const parsed = parseL4StructuredPublicTurnV1(
        terminal.rawResponse,
        task.claim.options?.map((_, index) => `opt_${index + 1}`) ?? [],
      );
      if (JSON.stringify(parsed) !== JSON.stringify(terminal.parsedPublicTurn)) {
        throw new Error("trajectory_public_run_structured_turn_binding_invalid");
      }
    } else if (terminal.parsedPublicTurn !== undefined) {
      throw new Error("trajectory_public_run_plain_turn_must_not_have_parsed_choice");
    }
  });
  const { contentHash, ...body } = artifact;
  if (hashCollectiveDynamicsValueV1(body) !== contentHash) {
    throw new Error("trajectory_public_run_hash_mismatch");
  }
}
