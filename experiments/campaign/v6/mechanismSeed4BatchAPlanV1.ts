import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { MECHANISM_ARMS, MECHANISM_DISCLOSURE_CONTRACT_REF, type MechanismArmV1 } from "./mechanismDisclosureContractV1";
import { MECHANISM_FORK_CORE_REF } from "./mechanismForkCoreV1";

export const SEED4_BATCH_A_IDS = Object.freeze([15,16,17,18,19,20,21,22,23,25,26,27,29,30,31,34,35,36]);
export const SEED4_BATCH_B_IDS = Object.freeze([37,38,40,41,42,43,44,46,47,48,49,50,51,52,53,55,56,57,58,59,60,61,62,63,64,65]);
const AGENTS: Record<number, number> = {15:4,16:4,17:4,18:4,19:4,20:4,21:4,22:4,23:4,25:4,26:4,27:4,29:4,30:3,31:4,34:3,35:4,36:4};
export const SEED4_BATCH_A_OUTPUT = "experiments/campaign/pilot_output/v6-fork-mechanism-neutral-labeled-seed4-batch-a-20260823";
export const SEED4_FREEZE = "docs/experiments/FIRST_PAPER_MECHANISM_SEED4_BUDGET_REPLICATION_FREEZE_V1.md";

export interface Seed4BatchAPlanV1 {
  planRef:{id:"swarmalpha.experiment.v6.mechanism-seed4-batch-a-plan";version:"1.0.0"}; model:"zhipu:glm-4.6v"; seed:4;
  taskIds:number[]; predeclaredBatchBTaskIds:number[]; arms:MechanismArmV1[];
  blocks:Array<{taskId:number;seed:4;position:number;expectedAgentCount:number;armOrder:MechanismArmV1[]}>;
  agentPositions:70; plannedLogicalCalls:490; perCallTokenEstimate:1800; plannedEstimateTokens:882000; tokenStopThreshold:900000;
  discussionMaxTokens:768;finalMaxTokens:256;thinking:"disabled";concurrency:1;outputDir:string;
  disclosureContractRef:{id:string;version:string};forkCoreRef:{id:string;version:string};analysisSpec:{path:string;contentHash:string};contentHash:string;
}
function sha(s:string){return `sha256:${createHash("sha256").update(s,"utf8").digest("hex")}`;}
function canon(v:unknown):unknown{if(v===null||typeof v!=="object")return v;if(Array.isArray(v))return v.map(canon);return Object.fromEntries(Object.keys(v as Record<string,unknown>).sort().map(k=>[k,canon((v as Record<string,unknown>)[k]) ]));}
export function recomputeSeed4BatchAPlanHashV1(p:Seed4BatchAPlanV1){const{contentHash:_,...b}=p;return sha(JSON.stringify(canon(b)));}
export function buildSeed4BatchAPlanV1():Seed4BatchAPlanV1{
  const orders:MechanismArmV1[][]=[["CONTROL","ATTACKS_NEUTRAL","ATTACKS_LABELED"],["ATTACKS_NEUTRAL","ATTACKS_LABELED","CONTROL"],["ATTACKS_LABELED","CONTROL","ATTACKS_NEUTRAL"]];
  const blocks=SEED4_BATCH_A_IDS.map((taskId,position)=>({taskId,seed:4 as const,position,expectedAgentCount:AGENTS[taskId],armOrder:[...orders[(position+1)%3]]}));
  const body:Omit<Seed4BatchAPlanV1,"contentHash">={planRef:{id:"swarmalpha.experiment.v6.mechanism-seed4-batch-a-plan",version:"1.0.0"},model:"zhipu:glm-4.6v",seed:4,taskIds:[...SEED4_BATCH_A_IDS],predeclaredBatchBTaskIds:[...SEED4_BATCH_B_IDS],arms:[...MECHANISM_ARMS],blocks,agentPositions:70,plannedLogicalCalls:490,perCallTokenEstimate:1800,plannedEstimateTokens:882000,tokenStopThreshold:900000,discussionMaxTokens:768,finalMaxTokens:256,thinking:"disabled",concurrency:1,outputDir:SEED4_BATCH_A_OUTPUT,disclosureContractRef:{...MECHANISM_DISCLOSURE_CONTRACT_REF},forkCoreRef:{...MECHANISM_FORK_CORE_REF},analysisSpec:{path:SEED4_FREEZE,contentHash:sha(readFileSync(resolve(SEED4_FREEZE),"utf8"))}};
  return {...body,contentHash:sha(JSON.stringify(canon(body)))};
}
export function freezeSeed4BatchAPlanV1(outputDir:string){const p=buildSeed4BatchAPlanV1();const f=join(resolve(outputDir),"plan.json");if(existsSync(f)){const e=JSON.parse(readFileSync(f,"utf8")) as Seed4BatchAPlanV1;if(recomputeSeed4BatchAPlanHashV1(e)!==e.contentHash||e.contentHash!==p.contentHash)throw new Error("seed4_plan_conflict");return e;}mkdirSync(resolve(outputDir),{recursive:true});writeFileSync(f,`${JSON.stringify(p,null,2)}\n`);return p;}
export function loadSeed4BatchAPlanV1(outputDir:string){const f=join(resolve(outputDir),"plan.json");if(!existsSync(f))throw new Error("seed4_plan_missing");const p=JSON.parse(readFileSync(f,"utf8")) as Seed4BatchAPlanV1;if(recomputeSeed4BatchAPlanHashV1(p)!==p.contentHash||p.contentHash!==buildSeed4BatchAPlanV1().contentHash)throw new Error("seed4_plan_invalid");return p;}
