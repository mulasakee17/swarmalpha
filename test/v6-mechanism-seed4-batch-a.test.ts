import { describe,expect,it } from "vitest";
import { mkdtempSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSeed4BatchAPlanV1 } from "../experiments/campaign/v6/mechanismSeed4BatchAPlanV1";
import { executeSeed4BatchAV1 } from "../experiments/campaign/v6/run_v6_mechanism_seed4_batch_a_v1";
import { createHiddenBenchTaskProjectionV1 } from "../experiments/campaign/v6/hiddenBenchTaskAdapter";
import { verifyMechanismArtifactDirectoryV1 } from "../experiments/campaign/v6/mechanismManifestV1";
import type { SingleAttemptTextInvoker } from "../experiments/campaign/v6/providerAdapters";
import { buildSeed4BatchBPlanV1 } from "../experiments/campaign/v6/mechanismSeed4BatchBPlanV1";
import { executeSeed4BatchBV1 } from "../experiments/campaign/v6/run_v6_mechanism_seed4_batch_b_v1";

describe("seed4 mechanism batch A",()=>{
  it("freezes the budget and completes all 490 calls without network",async()=>{
    const plan=buildSeed4BatchAPlanV1();
    expect(plan.blocks.reduce((s,b)=>s+b.expectedAgentCount,0)).toBe(70);
    for(const b of plan.blocks)expect(createHiddenBenchTaskProjectionV1({sourceTaskId:b.taskId}).adapter.task.agents.length).toBe(b.expectedAgentCount);
    const dir=mkdtempSync(join(tmpdir(),"seed4-batch-a-"));
    try{
      const cache=new Map<number,{id:string;options:string[]}>();
      const baseInvoker:SingleAttemptTextInvoker={async invoke(req){const id=Number(req.requestId.match(/task-(\d+)/)?.[1]);let x=cache.get(id);if(!x){const t=createHiddenBenchTaskProjectionV1({sourceTaskId:id}).adapter.task;x={id:t.claim.id,options:t.claim.options};cache.set(id,x);}const probabilities=Object.fromEntries(x.options.map((o,i)=>[o,i===0?1:0]));const common={providerMetadata:{model:"glm-4.6v",requestId:req.requestId},usage:{totalTokens:10}};return req.requestId.startsWith("final:")?{rawContent:JSON.stringify({status:"answered",reports:[{claimId:x.id,value:{kind:"categorical",probabilities}}]}),...common}:{rawContent:JSON.stringify({message:"mock",belief:{kind:"categorical",probabilities},evidence:[{content:"mock evidence",relation:"attacks"}]}),...common};}};
      const r=await executeSeed4BatchAV1({outputDir:dir,baseInvoker,clock:()=>"2026-08-23T00:00:00.000Z"});
      expect(r.summary.status).toBe("completed");expect(r.summary.completedTaskIds).toHaveLength(18);expect(r.summary.physicalAttempts).toBe(490);expect(r.summary.observedTokens).toBe(4900);expect(verifyMechanismArtifactDirectoryV1(dir).contentHash).toBe(r.manifestHash);
    }finally{rmSync(dir,{recursive:true,force:true});}
  },30000);
});

describe("seed4 mechanism batch B",()=>{
  it("preserves original roster positions and completes 721 mock calls",async()=>{
    const plan=buildSeed4BatchBPlanV1();expect(plan.blocks.reduce((s,b)=>s+b.expectedAgentCount,0)).toBe(103);expect(plan.blocks[0].position).toBe(18);
    for(const b of plan.blocks)expect(createHiddenBenchTaskProjectionV1({sourceTaskId:b.taskId}).adapter.task.agents.length).toBe(b.expectedAgentCount);
    const dir=mkdtempSync(join(tmpdir(),"seed4-batch-b-"));try{const cache=new Map<number,{id:string;options:string[]}>();const baseInvoker:SingleAttemptTextInvoker={async invoke(req){const id=Number(req.requestId.match(/task-(\d+)/)?.[1]);let x=cache.get(id);if(!x){const t=createHiddenBenchTaskProjectionV1({sourceTaskId:id}).adapter.task;x={id:t.claim.id,options:t.claim.options};cache.set(id,x);}const probabilities=Object.fromEntries(x.options.map((o,i)=>[o,i===0?1:0]));const common={providerMetadata:{model:"glm-4.6v",requestId:req.requestId},usage:{totalTokens:10}};return req.requestId.startsWith("final:")?{rawContent:JSON.stringify({status:"answered",reports:[{claimId:x.id,value:{kind:"categorical",probabilities}}]}),...common}:{rawContent:JSON.stringify({message:"mock",belief:{kind:"categorical",probabilities},evidence:[{content:"mock evidence",relation:"attacks"}]}),...common};}};const r=await executeSeed4BatchBV1({outputDir:dir,baseInvoker,clock:()=>"2026-08-23T00:00:00.000Z"});expect(r.summary.status).toBe("completed");expect(r.summary.completedTaskIds).toHaveLength(26);expect(r.summary.physicalAttempts).toBe(721);expect(r.summary.observedTokens).toBe(7210);expect(verifyMechanismArtifactDirectoryV1(dir).contentHash).toBe(r.manifestHash);}finally{rmSync(dir,{recursive:true,force:true});}
  },30000);
});
