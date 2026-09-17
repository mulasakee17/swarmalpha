import { callZhipuOnce, callZhipuRawOnce } from "../../../src/lib/llm/providers";
import type {
  SingleAttemptTextInvokeRequest,
  SingleAttemptTextInvoker,
} from "./providerAdapters";
import { classifyLLMProviderError, V6ProviderInvocationError } from "./providerDiagnostics";

const ZHIPU_GLM_MODEL_REF = Object.freeze({
  id: "zhipu:glm-4.5-air",
  version: "1.0.0",
});

function parseInvocationConfig(config: Record<string, unknown>): {
  temperature?: number;
  seed?: number;
  maxTokens?: number;
  thinking?: "enabled" | "disabled";
} {
  const allowed = new Set(["temperature", "seed", "maxTokens", "thinking"]);
  if (Object.keys(config).some(key => !allowed.has(key))) {
    throw new Error("zhipu_single_attempt_invocation_config_unsupported");
  }
  if (config.temperature !== undefined
    && (!Number.isFinite(config.temperature) || (config.temperature as number) < 0
      || (config.temperature as number) > 2)) {
    throw new Error("zhipu_single_attempt_temperature_invalid");
  }
  if (config.seed !== undefined && !Number.isSafeInteger(config.seed)) {
    throw new Error("zhipu_single_attempt_seed_invalid");
  }
  if (config.maxTokens !== undefined
    && (!Number.isSafeInteger(config.maxTokens) || (config.maxTokens as number) < 1)) {
    throw new Error("zhipu_single_attempt_max_tokens_invalid");
  }
  if (config.thinking !== undefined
    && config.thinking !== "enabled" && config.thinking !== "disabled") {
    throw new Error("zhipu_single_attempt_thinking_invalid");
  }
  return {
    ...(config.temperature !== undefined ? { temperature: config.temperature as number } : {}),
    ...(config.seed !== undefined ? { seed: config.seed as number } : {}),
    ...(config.maxTokens !== undefined ? { maxTokens: config.maxTokens as number } : {}),
    ...(config.thinking !== undefined
      ? { thinking: config.thinking as "enabled" | "disabled" }
      : {}),
  };
}

function assertSupportedRequest(request: Readonly<SingleAttemptTextInvokeRequest>, modelRefId: string): void {
  if (request.modelRef.id !== modelRefId
    || request.modelRef.version !== ZHIPU_GLM_MODEL_REF.version) {
    throw new Error("zhipu_single_attempt_model_ref_unsupported");
  }
  if (request.responseFormat !== "json" && request.responseFormat !== "text") {
    throw new Error("zhipu_single_attempt_response_format_invalid");
  }
}

/**
 * GLM-4-Flash does not honor a response_format JSON directive the way DeepSeek
 * does, so it wraps its JSON in a ```json markdown fence. The fork's discussion
 * parser (parseBeliefResponse) uses strict JSON.parse and rejects the fence.
 * Strip the fence here so the discussion responses parse; this mirrors what
 * DeepSeek returns natively and does not alter the final-elicitation path.
 */
function stripCodeFence(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    const firstNewline = t.indexOf("\n");
    t = firstNewline >= 0 ? t.slice(firstNewline + 1) : t.slice(3);
    const lastFence = t.lastIndexOf("```");
    if (lastFence >= 0) t = t.slice(0, lastFence);
    t = t.trim();
  }
  return t;
}

/**
 * GLM single-attempt invoker for the v6 fork cross-model validation.
 *
 * Single-attempt discipline: one `invoke` performs at most ONE HTTP request
 * (callZhipuOnce — no callLLM retry envelope, no outer retry loop). Network,
 * rate-limit, timeout, and HTTP failures are converted to the existing
 * V6ProviderInvocationError diagnostic codes and returned as explicit
 * failures; they are never silently re-sampled. The caller's AbortSignal is
 * forwarded to the underlying request. V6ProviderCallBudget (wrapped around
 * this invoker by the runner) therefore counts real provider attempts and
 * recorded usage exactly.
 *
 * `maxTokens` and `thinking` are parsed from invocationConfig and forwarded to
 * the provider request body (callZhipuOnce maps thinking to the API's
 * `{"thinking": {"type": ...}}` envelope). Thinking is forwarded verbatim:
 * reasoning-tier GLM models default to thinking ON, so callers that require
 * deterministic behavior (e.g. the GLM-4.6V two-arm cross-model gate) MUST pass
 * `thinking: "disabled"` explicitly in every invocation config; nothing here
 * silently enables or disables thinking.
 */
export function createZhipuSingleAttemptInvoker(glmModelId: string = "glm-4.5-air"): SingleAttemptTextInvoker {
  const modelRefId = `zhipu:${glmModelId}`;
  return {
    async invoke(request, signal) {
      assertSupportedRequest(request, modelRefId);
      const config = parseInvocationConfig(request.invocationConfig);
      let response;
      try {
        response = await callZhipuOnce(request.systemPrompt, request.userPrompt, {
          provider: "zhipu",
          model: glmModelId,
          responseFormat: request.responseFormat,
          timeout: 600_000,
          ...config,
        }, signal);
      } catch (error) {
        throw new V6ProviderInvocationError(classifyLLMProviderError(error));
      }
      return {
        rawContent: stripCodeFence(response.rawContent),
        ...(response.providerModel !== undefined || response.providerRequestId !== undefined
          ? {
              providerMetadata: {
                ...(response.providerModel !== undefined ? { model: response.providerModel } : {}),
                ...(response.providerRequestId !== undefined ? { requestId: response.providerRequestId } : {}),
              },
            }
          : {}),
        ...(response.usage || response.latencyMs !== undefined
          ? {
              usage: {
                ...(response.usage ? {
                  promptTokens: response.usage.promptTokens,
                  completionTokens: response.usage.completionTokens,
                  totalTokens: response.usage.totalTokens,
                  ...(response.usage.cachedPromptTokens !== undefined
                    ? { cachedPromptTokens: response.usage.cachedPromptTokens }
                    : {}),
                } : {}),
                ...(response.latencyMs !== undefined ? { latencyMs: response.latencyMs } : {}),
              },
            }
          : {}),
      };
    },
  };
}

/**
 * Raw-preserving counterpart for measurement qualification. A non-empty
 * provider completion is returned byte-for-byte to the instrument parser:
 * there is no legacy emotion/reasoning parse and no markdown-fence stripping.
 */
export function createZhipuRawSingleAttemptInvoker(
  glmModelId: string = "glm-4.5-air",
  apiKey?: string,
  rawContentSource: "content_or_reasoning" | "content_only" = "content_or_reasoning",
): SingleAttemptTextInvoker {
  const modelRefId = `zhipu:${glmModelId}`;
  return {
    async invoke(request, signal) {
      assertSupportedRequest(request, modelRefId);
      const config = parseInvocationConfig(request.invocationConfig);
      let response;
      try {
        response = await callZhipuRawOnce(request.systemPrompt, request.userPrompt, {
          provider: "zhipu",
          model: glmModelId,
          ...(apiKey !== undefined ? { apiKey } : {}),
          rawContentSource,
          responseFormat: request.responseFormat,
          timeout: 600_000,
          ...config,
        }, signal);
      } catch (error) {
        throw new V6ProviderInvocationError(classifyLLMProviderError(error));
      }
      return {
        rawContent: response.rawContent,
        ...(response.providerModel !== undefined || response.providerRequestId !== undefined
          ? {
              providerMetadata: {
                ...(response.providerModel !== undefined ? { model: response.providerModel } : {}),
                ...(response.providerRequestId !== undefined ? { requestId: response.providerRequestId } : {}),
              },
            }
          : {}),
        ...(response.usage || response.latencyMs !== undefined
          ? {
              usage: {
                ...(response.usage ? {
                  promptTokens: response.usage.promptTokens,
                  completionTokens: response.usage.completionTokens,
                  totalTokens: response.usage.totalTokens,
                  ...(response.usage.cachedPromptTokens !== undefined
                    ? { cachedPromptTokens: response.usage.cachedPromptTokens }
                    : {}),
                } : {}),
                ...(response.latencyMs !== undefined ? { latencyMs: response.latencyMs } : {}),
              },
            }
          : {}),
      };
    },
  };
}

export { ZHIPU_GLM_MODEL_REF };
