# Collective Dynamics M2 Preflight

Date: 2026-08-28  
Status: **PUBLIC-STAGE PREFLIGHT PASS; NO PROVIDER CALLS EXECUTED**

## FACT

The file-backed M2 plan was written and replayed through the real CLI entry.
The zero-provider public-stage preflight returned:

```text
planHash:               sha256:7212455275fefee6c988d23bdfe480775b07b8f03a86872eda2bef1f424aa528
sourceTaskCount:        5
registeredAgentCount:   19
publicRounds:           3
plannedPublicCalls:     57
outputFresh:            true
providerCallsExecuted:  0
```

The complete injected-invoker path has also executed 57 public cells followed
by 152 sensor cells. TypeScript checking and the related regression suite pass.
Those are implementation tests, not scientific observations.

## DECISION

The implementation is eligible for the paid public stage, subject to explicit
owner authorization. Execution remains staged:

1. run the 57 message-only public calls;
2. verify five complete public trajectory artifacts and their ledgers;
3. derive and preflight the 152-cell sensor freeze;
4. request separate authorization for the sensor stage.

This document does not authorize either paid stage. No collective-dynamics,
wrong-consensus entry, persistence, escape, or recoverability result exists yet.

## STOP CONDITIONS

- Any public provider failure or empty response stops the run; there is no
  retry and the partial ledger remains evidence of a failed execution.
- Missing or non-replayable public artifacts block the sensor freeze.
- The sensor stage cannot begin merely because the public CLI was invoked.
- A provider/account anomaly stops execution before proceeding to the next
  stage.
