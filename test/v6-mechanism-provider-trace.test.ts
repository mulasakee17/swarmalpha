import { describe, expect, it } from "vitest";
import { createMechanismTracedInvokerV1 } from "../experiments/campaign/v6/mechanismProviderTraceV1";
import type { SingleAttemptTextInvokeRequest } from "../experiments/campaign/v6/providerAdapters";

const request: SingleAttemptTextInvokeRequest = {
  requestId: "mechanism:test:1",
  systemPrompt: "system",
  userPrompt: "truth-blind task",
  responseFormat: "json",
  modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
  invocationConfig: { maxTokens: 768, thinking: "disabled", seed: 3 },
};

describe("mechanism traced invoker", () => {
  it("records the exact request, raw response, provider identity and usage", async () => {
    const traced = createMechanismTracedInvokerV1({
      maxObservedTokens: 100,
      clock: (() => { let n = 0; return () => `t${++n}`; })(),
      baseInvoker: { async invoke() { return {
        rawContent: "{\"ok\":true}",
        providerMetadata: { model: "glm-4.6v", requestId: "provider-1" },
        usage: { promptTokens: 5, completionTokens: 7, totalTokens: 12 },
      }; } },
    });
    await traced.invoker.invoke(request, new AbortController().signal);
    expect(traced.observedTokens()).toBe(12);
    expect(traced.attempts).toHaveLength(1);
    expect(traced.attempts[0]).toMatchObject({
      status: "response", requestId: request.requestId,
      systemPrompt: "system", userPrompt: "truth-blind task",
      rawResponse: "{\"ok\":true}", providerMetadata: { requestId: "provider-1" },
      usage: { totalTokens: 12 }, startedAt: "t1", finishedAt: "t2",
    });
  });

  it("rejects duplicate physical requests and truth-bearing prompts", async () => {
    const traced = createMechanismTracedInvokerV1({
      maxObservedTokens: 100,
      baseInvoker: { async invoke() { return { rawContent: "ok", usage: { totalTokens: 1 } }; } },
    });
    await traced.invoker.invoke(request, new AbortController().signal);
    await expect(traced.invoker.invoke(request, new AbortController().signal))
      .rejects.toThrow("mechanism_duplicate_physical_request");
    await expect(traced.invoker.invoke(
      { ...request, requestId: "mechanism:test:2", userPrompt: "resolvedOption=A" },
      new AbortController().signal,
    )).rejects.toThrow("mechanism_online_truth_leak");
  });

  it("fails closed on unknown usage and token-cap exceedance while preserving the response", async () => {
    const unknown = createMechanismTracedInvokerV1({
      maxObservedTokens: 100,
      baseInvoker: { async invoke() { return { rawContent: "raw-without-usage" }; } },
    });
    await expect(unknown.invoker.invoke(request, new AbortController().signal))
      .rejects.toThrow("mechanism_usage_unknown");
    expect(unknown.attempts[0]).toMatchObject({
      status: "response", rawResponse: "raw-without-usage", errorCode: "mechanism_usage_unknown",
    });

    const capped = createMechanismTracedInvokerV1({
      maxObservedTokens: 10,
      baseInvoker: { async invoke() { return { rawContent: "raw", usage: { totalTokens: 11 } }; } },
    });
    await expect(capped.invoker.invoke(request, new AbortController().signal))
      .rejects.toThrow("mechanism_token_stop_exceeded");
    expect(capped.observedTokens()).toBe(11);
  });
});
