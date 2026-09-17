import { describe, expect, it } from "vitest";
import {
  buildDiscussionThermometerStateSpaceExecutionManifestV1,
  verifyDiscussionThermometerStateSpaceExecutionManifestV1,
} from "../experiments/campaign/v6/discussionThermometerStateSpaceCalibrationManifestV1";

describe("discussion thermometer state-space execution manifest v1", () => {
  it("freezes the accepted development-only semantics and exact provider cap", () => {
    const manifest = buildDiscussionThermometerStateSpaceExecutionManifestV1();
    expect(() => verifyDiscussionThermometerStateSpaceExecutionManifestV1(manifest)).not.toThrow();
    expect(manifest.semanticAcceptance.status).toBe("ACCEPTED_DEVELOPMENT_ONLY");
    expect(manifest.providerBudget.maximumTotalCalls).toBe(256);
    expect(manifest.providerBudget.retry).toBe("none");
    expect(manifest.executionPolicy.backgroundExecution).toBe("forbidden");
    expect(manifest.scientificBoundary.onlineTruthAccess).toBe("none");
  });
});
