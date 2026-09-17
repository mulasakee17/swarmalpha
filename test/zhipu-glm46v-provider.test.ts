/**
 * GLM-4.6V gate wire tests (zero network, mocked fetch):
 *  1. callZhipuOnce request shaping: max_tokens, thinking, validation, usage;
 *  2. DeepSeek path regression (bodies unchanged);
 *  3. zhipuSingleAttemptInvoker SINGLE-ATTEMPT semantics: one invoke == at most
 *     one fetch — retryable 429 / 500 / network errors never re-fetch; the
 *     AbortSignal is forwarded; failed calls count as one provider attempt in
 *     the V6 budget; successful usage flows into the budget.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callLLM, callZhipuOnce, callZhipuRawOnce, detectLLMProvider, LLMError } from "@/lib/llm/providers";
import {
  createZhipuRawSingleAttemptInvoker,
  createZhipuSingleAttemptInvoker,
} from "../experiments/campaign/v6/zhipuSingleAttemptInvoker";
import { V6ProviderCallBudget, createMeteredSingleAttemptInvoker } from "../experiments/campaign/v6/run_v6_smoke";
import type { SingleAttemptTextInvokeRequest, SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";

interface CapturedCall {
  url: string;
  body: Record<string, unknown>;
  signal: AbortSignal | null;
}

/** Mock fetch that captures the request body and returns a controllable response. */
function installFetchMock(opts: {
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens: number };
  } | undefined;
  providerModel?: string;
  providerRequestId?: string;
  message?: Record<string, unknown>;
  status?: number;
  throwNetworkError?: boolean;
  abortSignalBehavior?: "abort" | "ignore";
} = {}): { calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const content = opts.content ?? JSON.stringify({ emotion: 1, reasoning: "ok" });
  const data: Record<string, unknown> = {
    choices: [{ message: opts.message ?? { content } }],
    ...(opts.providerModel !== undefined ? { model: opts.providerModel } : {}),
    ...(opts.providerRequestId !== undefined ? { request_id: opts.providerRequestId } : {}),
  };
  if (opts.usage !== undefined) data.usage = opts.usage;
  const status = opts.status ?? 200;
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const signal = (init?.signal as AbortSignal | undefined) ?? null;
    calls.push({ url, body: JSON.parse(String(init?.body)) as Record<string, unknown>, signal });
    if (opts.throwNetworkError) throw new Error("network failure");
    if (opts.abortSignalBehavior === "abort" && signal?.aborted) {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      json: async () => data,
      text: async () => "",
    } as unknown as Response;
  });
  return { calls };
}

const USAGE = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 };

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ZHIPU_API_KEY;
});

function zhipuInvokeRequest(overrides: Partial<SingleAttemptTextInvokeRequest> = {}): SingleAttemptTextInvokeRequest {
  return {
    requestId: "discussion:fork:task-14:seed-0:r1:agent:hiddenbench:14:1",
    systemPrompt: "system",
    userPrompt: "user",
    responseFormat: "json",
    modelRef: { id: "zhipu:glm-4.6v", version: "1.0.0" },
    invocationConfig: { temperature: 0, maxTokens: 768, thinking: "disabled", seed: 5 },
    ...overrides,
  };
}

describe("callZhipuOnce request shaping (GLM-4.6V gate)", () => {
  it("offers a raw boundary that preserves a non-empty completion the legacy parser rejects", async () => {
    const { calls } = installFetchMock({ content: "x", usage: USAGE });
    const result = await callZhipuRawOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test",
      responseFormat: "json", maxTokens: 256, thinking: "disabled",
    });
    expect(calls).toHaveLength(1);
    expect(result.rawContent).toBe("x");
    expect(result.usage?.totalTokens).toBe(150);
  });

  it("lets X0-style content-only callers reject unexpected reasoning and keep partial usage unavailable", async () => {
    const unexpected = installFetchMock({
      message: { content: "{}", reasoning_content: "hidden reasoning" },
      usage: USAGE,
    });
    const invoker = createZhipuRawSingleAttemptInvoker("glm-4.6v", "sk-test", "content_only");
    await expect(invoker.invoke(zhipuInvokeRequest(), new AbortController().signal)).rejects.toThrow();
    expect(unexpected.calls).toHaveLength(1);

    vi.unstubAllGlobals();
    const partial = installFetchMock({ content: "{}", usage: { prompt_tokens: 7 } as never });
    const result = await invoker.invoke(zhipuInvokeRequest(), new AbortController().signal);
    expect(partial.calls).toHaveLength(1);
    expect(result.usage?.promptTokens).toBeUndefined();
    expect(result.usage?.totalTokens).toBeUndefined();
  });

  it("retains the generic raw caller's legacy visible-or-reasoning fallback", async () => {
    installFetchMock({ message: { content: "", reasoning_content: "legacy fallback" }, usage: USAGE });
    const result = await callZhipuRawOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test", responseFormat: "json",
    });
    expect(result.rawContent).toBe("legacy fallback");
  });

  it("forwards maxTokens -> max_tokens and thinking -> {type:'disabled'}; usage parsed back verbatim", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    const result = await callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test",
      temperature: 0, maxTokens: 768, thinking: "disabled",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("open.bigmodel.cn");
    expect(calls[0].body.model).toBe("glm-4.6v");
    expect(calls[0].body.max_tokens).toBe(768);
    expect(calls[0].body.thinking).toEqual({ type: "disabled" });
    expect(calls[0].body.temperature).toBe(0);
    expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
  });

  it("forwards an explicit JSON response contract to Zhipu", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test",
      responseFormat: "json", maxTokens: 768, thinking: "disabled",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.response_format).toEqual({ type: "json_object" });
  });

  it("preserves server model, request id, and cached-token evidence", async () => {
    installFetchMock({
      providerModel: "glm-4.6v",
      providerRequestId: "req-provider-1",
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        prompt_tokens_details: { cached_tokens: 80 },
      },
    });
    const result = await callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test",
    });
    expect(result.providerModel).toBe("glm-4.6v");
    expect(result.providerRequestId).toBe("req-provider-1");
    expect(result.usage?.cachedPromptTokens).toBe(80);
  });

  it("does not force JSON mode for explicit text calls or legacy callers", async () => {
    const explicitText = installFetchMock({ usage: USAGE });
    await callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test", responseFormat: "text",
    });
    expect(explicitText.calls[0].body.response_format).toBeUndefined();

    vi.unstubAllGlobals();
    const legacy = installFetchMock({ usage: USAGE });
    await callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test",
    });
    expect(legacy.calls[0].body.response_format).toBeUndefined();
  });

  it("sends thinking enabled when explicitly configured", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test", thinking: "enabled",
    });
    expect(calls[0].body.thinking).toEqual({ type: "enabled" });
  });

  it("omits max_tokens and thinking when unset (existing Zhipu callers unchanged)", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await callZhipuOnce("sys", "user", { provider: "zhipu", model: "glm-4-flash", apiKey: "sk-test" });
    expect(calls[0].body.max_tokens).toBeUndefined();
    expect(calls[0].body.thinking).toBeUndefined();
    expect(calls[0].body.temperature).toBe(0.7);
  });

  it("leaves usage undefined when the provider omits usage (no invented zeros)", async () => {
    const { calls } = installFetchMock({ usage: undefined });
    const result = await callZhipuOnce("sys", "user", { provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test" });
    expect(calls).toHaveLength(1);
    expect(result.usage).toBeUndefined();
  });

  it("rejects invalid maxTokens (non-positive) without calling the API", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await expect(callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test", maxTokens: 0,
    })).rejects.toMatchObject({ name: "LLMError", type: "UNKNOWN", isRetryable: false });
    expect(calls).toHaveLength(0);
  });

  it("rejects invalid thinking values ('deep' is not accepted) without calling the API", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await expect(callZhipuOnce("sys", "user", {
      provider: "zhipu", model: "glm-4.6v", apiKey: "sk-test", thinking: "deep" as never,
    })).rejects.toMatchObject({ name: "LLMError", type: "UNKNOWN", isRetryable: false });
    expect(calls).toHaveLength(0);
  });

  it("rejects a non-zhipu provider in config", async () => {
    await expect(callZhipuOnce("sys", "user", {
      provider: "deepseek", model: "deepseek-chat", apiKey: "sk-test",
    })).rejects.toMatchObject({ name: "LLMError", isRetryable: false });
  });

  it("detectLLMProvider('glm-4.6v') resolves to zhipu", () => {
    expect(detectLLMProvider("glm-4.6v")).toBe("zhipu");
  });
});

describe("DeepSeek path regression (must stay byte-identical)", () => {
  it("default DeepSeek request body is unchanged: no thinking key, no max_tokens, json_object envelope", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await callLLM("sys", "user", { provider: "deepseek", model: "deepseek-chat", apiKey: "sk-test" });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("api.deepseek.com");
    const body = calls[0].body;
    expect(body.thinking).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.temperature).toBe(0.7);
    expect(body.model).toBe("deepseek-chat");
  });

  it("DeepSeek keeps its existing maxTokens -> max_tokens mapping and never gains a thinking key", async () => {
    const { calls } = installFetchMock({ usage: USAGE });
    await callLLM("sys", "user", {
      provider: "deepseek", model: "deepseek-chat", apiKey: "sk-test",
      maxTokens: 256, thinking: "disabled", temperature: 0,
    });
    const body = calls[0].body;
    expect(body.max_tokens).toBe(256);
    expect(body.thinking).toBeUndefined();
  });
});

describe("zhipuSingleAttemptInvoker — one invoke == at most one fetch", () => {
  beforeEach(() => {
    process.env.ZHIPU_API_KEY = "sk-test-dummy";
  });

  it("forwards maxTokens/thinking into the wire body and returns provider usage verbatim (single fetch)", async () => {
    const { calls } = installFetchMock({
      usage: { ...USAGE, prompt_tokens_details: { cached_tokens: 75 } },
      providerModel: "glm-4.6v",
      providerRequestId: "req-invoker-1",
    });
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    const result = await invoker.invoke(zhipuInvokeRequest(), new AbortController().signal);
    expect(calls).toHaveLength(1);
    expect(calls[0].body.max_tokens).toBe(768);
    expect(calls[0].body.thinking).toEqual({ type: "disabled" });
    expect(result.usage?.promptTokens).toBe(100);
    expect(result.usage?.completionTokens).toBe(50);
    expect(result.usage?.totalTokens).toBe(150);
    expect(result.usage?.cachedPromptTokens).toBe(75);
    expect(result.providerMetadata).toEqual({ model: "glm-4.6v", requestId: "req-invoker-1" });
  });

  it("keeps the GLM fenced-JSON cleaning: rawContent has the fence stripped", async () => {
    const fenced = "```json\n" + JSON.stringify({ emotion: 1, reasoning: "ok" }) + "\n```";
    installFetchMock({ content: fenced, usage: USAGE });
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    const result = await invoker.invoke(zhipuInvokeRequest(), new AbortController().signal);
    expect(result.rawContent.startsWith("```")).toBe(false);
    expect(result.rawContent).toBe(JSON.stringify({ emotion: 1, reasoning: "ok" }));
  });

  it("keeps fenced output byte-for-byte on the measurement-only raw invoker", async () => {
    const fenced = "```json\n{\"probabilities\":{\"opt_1\":1}}\n```";
    const { calls } = installFetchMock({ content: fenced, usage: USAGE });
    const invoker = createZhipuRawSingleAttemptInvoker("glm-4.6v");
    const result = await invoker.invoke(zhipuInvokeRequest({
      requestId: "sensor-canary:task-1:agent-1:baseline_a",
      invocationConfig: { temperature: 0, maxTokens: 256, thinking: "disabled", seed: 1 },
    }), new AbortController().signal);
    expect(calls).toHaveLength(1);
    expect(result.rawContent).toBe(fenced);
  });

  it("retryable 429 triggers exactly ONE fetch and maps to provider_rate_limit (no internal retry)", async () => {
    const { calls } = installFetchMock({ status: 429 });
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(zhipuInvokeRequest(), new AbortController().signal))
      .rejects.toMatchObject({ name: "V6ProviderInvocationError", code: "provider_rate_limit" });
    expect(calls).toHaveLength(1);
  });

  it("retryable 500 triggers exactly ONE fetch and maps to provider_api_error", async () => {
    const { calls } = installFetchMock({ status: 500 });
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(zhipuInvokeRequest(), new AbortController().signal))
      .rejects.toMatchObject({ name: "V6ProviderInvocationError", code: "provider_api_error" });
    expect(calls).toHaveLength(1);
  });

  it("network error triggers exactly ONE fetch and maps to provider_network", async () => {
    const { calls } = installFetchMock({ throwNetworkError: true });
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(zhipuInvokeRequest(), new AbortController().signal))
      .rejects.toMatchObject({ name: "V6ProviderInvocationError", code: "provider_network" });
    expect(calls).toHaveLength(1);
  });

  it("the caller's AbortSignal is forwarded: aborting it aborts the fetch-level signal", async () => {
    let captured: AbortSignal | null = null;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      captured = (init?.signal as AbortSignal | undefined) ?? null;
      await gate;
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    });
    const controller = new AbortController();
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    const pending = invoker.invoke(zhipuInvokeRequest(), controller.signal);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(captured).not.toBeNull();
    expect(captured!.aborted).toBe(false);
    controller.abort();
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(captured!.aborted).toBe(true);
    release();
    await expect(pending).rejects.toMatchObject({ name: "V6ProviderInvocationError", code: "provider_timeout" });
  });

  it("an already-aborted signal maps to provider_timeout with exactly ONE fetch attempt", async () => {
    const { calls } = installFetchMock({ abortSignalBehavior: "abort" });
    const controller = new AbortController();
    controller.abort();
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(zhipuInvokeRequest(), controller.signal))
      .rejects.toMatchObject({ name: "V6ProviderInvocationError", code: "provider_timeout" });
    expect(calls).toHaveLength(1);
  });

  it("a failed call counts as exactly ONE provider attempt in the V6 budget (token usage unknown, never zero)", async () => {
    installFetchMock({ status: 429 });
    const budget = new V6ProviderCallBudget(100, 5_200_000);
    const metered = createMeteredSingleAttemptInvoker(createZhipuSingleAttemptInvoker("glm-4.6v"), budget);
    await expect(metered.invoke(zhipuInvokeRequest(), new AbortController().signal))
      .rejects.toMatchObject({ name: "V6ProviderInvocationError" });
    expect(budget.callCount).toBe(1);
    expect(budget.tokenCount).toBe(0);
  });

  it("successful usage flows into the V6 budget", async () => {
    installFetchMock({ usage: USAGE });
    const budget = new V6ProviderCallBudget(100, 5_200_000);
    const metered = createMeteredSingleAttemptInvoker(createZhipuSingleAttemptInvoker("glm-4.6v"), budget);
    await metered.invoke(zhipuInvokeRequest(), new AbortController().signal);
    expect(budget.callCount).toBe(1);
    expect(budget.tokenCount).toBe(150);
  });

  it("rejects unsupported invocation config keys", async () => {
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(
      zhipuInvokeRequest({ invocationConfig: { temperature: 0, foo: 1 } }),
      new AbortController().signal,
    )).rejects.toThrow("zhipu_single_attempt_invocation_config_unsupported");
  });

  it("rejects invalid thinking values in invocation config", async () => {
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(
      zhipuInvokeRequest({ invocationConfig: { temperature: 0, thinking: "sometimes" } }),
      new AbortController().signal,
    )).rejects.toThrow("zhipu_single_attempt_thinking_invalid");
  });

  it("rejects invalid maxTokens in invocation config", async () => {
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(
      zhipuInvokeRequest({ invocationConfig: { temperature: 0, maxTokens: -1 } }),
      new AbortController().signal,
    )).rejects.toThrow("zhipu_single_attempt_max_tokens_invalid");
  });

  it("a generic failure wraps into V6ProviderInvocationError and the underlying LLMError class still exists", async () => {
    installFetchMock({ status: 400 });
    const invoker = createZhipuSingleAttemptInvoker("glm-4.6v");
    await expect(invoker.invoke(zhipuInvokeRequest(), new AbortController().signal))
      .rejects.toMatchObject({ name: "V6ProviderInvocationError", code: "provider_api_error" });
    expect(typeof LLMError).toBe("function");
  });
});
