/** Budget-bounded seed-4 confirmatory replication batch A. */
import dotenv from "dotenv";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { SingleAttemptTextInvoker } from "./providerAdapters";
import { createZhipuSingleAttemptInvoker } from "./zhipuSingleAttemptInvoker";
import { buildSeed4BatchAPlanV1, freezeSeed4BatchAPlanV1 } from "./mechanismSeed4BatchAPlanV1";
import { createMechanismAttemptLedgerV1 } from "./mechanismAttemptLedgerV1";
import { createMechanismTracedInvokerV1 } from "./mechanismProviderTraceV1";
import { runMechanismGlmTaskV1 } from "./mechanismGlmTaskExecutionV1";
import { buildMechanismExecutionIdentityV1, writeMechanismExecutionIdentityV1 } from "./mechanismExecutionIdentityV1";
import { buildMechanismTaskArtifactV1, writeMechanismTaskArtifactV1 } from "./mechanismTaskArtifactV1";
import { buildMechanismManifestV1, verifyMechanismArtifactDirectoryV1, writeMechanismManifestV1 } from "./mechanismManifestV1";

function fresh(dir:string){if(!existsSync(dir))return;const ok=new Set(["plan.json","execution.json","attempts.jsonl"]);const bad=readdirSync(dir).filter(x=>!ok.has(x));if(bad.length)throw new Error(`seed4_output_not_fresh:${bad.join(",")}`);}
function code(e:unknown){return e instanceof Error&&/^[a-z0-9_:-]+$/.test(e.message)?e.message:"unknown_error";}
function fatal(c:string){return c.startsWith("mechanism_token_stop")||c==="mechanism_usage_unknown"||c.startsWith("mechanism_ledger_")||c.startsWith("mechanism_task_artifact_")||c==="mechanism_online_truth_leak";}
function writeSummary(dir:string,value:unknown){const f=join(dir,"summary.json"),t=`${JSON.stringify(value,null,2)}\n`;if(existsSync(f)){if(readFileSync(f,"utf8")!==t)throw new Error("seed4_summary_conflict");return;}writeFileSync(f,t);}

export async function executeSeed4BatchAV1(input:{outputDir:string;baseInvoker:SingleAttemptTextInvoker;clock?:()=>string}){
  const dir=resolve(input.outputDir);fresh(dir);const plan=freezeSeed4BatchAPlanV1(dir);
  const execution=buildMechanismExecutionIdentityV1({planHash:plan.contentHash,model:plan.model});writeMechanismExecutionIdentityV1(dir,execution);
  const ledger=createMechanismAttemptLedgerV1({file:join(dir,"attempts.jsonl"),clock:input.clock});
  const traced=createMechanismTracedInvokerV1({baseInvoker:input.baseInvoker,maxObservedTokens:plan.tokenStopThreshold,clock:input.clock,ledger});
  const completed:number[]=[],failures:Array<{taskId:number;code:string;physicalAttempts:number}>=[],skipped:number[]=[];
  const taskFiles:Array<{role:"task";fileName:string;taskId:number}>=[];let stopped=false;
  for(let i=0;i<plan.blocks.length;i++){
    const b=plan.blocks[i];const reserved=b.expectedAgentCount*7*plan.perCallTokenEstimate;
    if(traced.observedTokens()+reserved>plan.tokenStopThreshold){skipped.push(...plan.blocks.slice(i).map(x=>x.taskId));stopped=true;break;}
    const start=traced.attempts.length,tokenStart=traced.observedTokens();
    try{
      const r=await runMechanismGlmTaskV1({taskId:b.taskId,seed:b.seed,armOrder:b.armOrder,invoker:traced.invoker,clock:input.clock});
      const artifact=buildMechanismTaskArtifactV1({planHash:plan.contentHash,executionHash:execution.contentHash,model:plan.model,taskRun:r.task,round1Snapshot:r.round1Snapshot,parsedRecords:r.parsedRecords,providerAttempts:traced.attempts.slice(start),observedTokens:traced.observedTokens()-tokenStart});
      const fileName=writeMechanismTaskArtifactV1(dir,artifact);taskFiles.push({role:"task",fileName,taskId:b.taskId});completed.push(b.taskId);
    }catch(e){const c=code(e);failures.push({taskId:b.taskId,code:c,physicalAttempts:traced.attempts.length-start});if(fatal(c)){skipped.push(...plan.blocks.slice(i+1).map(x=>x.taskId));stopped=true;break;}}
  }
  const audit=ledger.audit();if(audit.started!==audit.finished||audit.unfinishedAttemptIds.length||audit.duplicateRequestHashes.length)throw new Error("seed4_ledger_gate_failed");
  const summary={summaryRef:{id:"swarmalpha.experiment.v6.mechanism-seed4-batch-a-summary",version:"1.0.0"},planHash:plan.contentHash,executionHash:execution.contentHash,status:stopped?"stopped_budget_or_global_gate":failures.length?"completed_with_failed_tasks":"completed",completedTaskIds:completed,failures,skippedTaskIds:skipped,predeclaredBatchBTaskIds:plan.predeclaredBatchBTaskIds,physicalAttempts:traced.attempts.length,observedTokens:traced.observedTokens()};
  writeSummary(dir,summary);const manifest=buildMechanismManifestV1({outputDir:dir,plan,files:[{role:"attempts",fileName:"attempts.jsonl"},{role:"execution",fileName:"execution.json"},{role:"summary",fileName:"summary.json"},...taskFiles]});writeMechanismManifestV1(dir,manifest);verifyMechanismArtifactDirectoryV1(dir);return{dir,summary,manifestHash:manifest.contentHash};
}
async function main(){const plan=buildSeed4BatchAPlanV1(),dir=resolve(plan.outputDir);if(process.argv.includes("--plan")){const p=freezeSeed4BatchAPlanV1(dir);console.log(JSON.stringify({mode:"plan",dir,planHash:p.contentHash}));return 0;}if(!process.argv.includes("--execute"))return 2;if(process.env.RUN_AUTHORIZED!=="yes"){console.error("seed4_execute_blocked");return 5;}dotenv.config({path:resolve(".env.local")});if(!process.env.ZHIPU_API_KEY){console.error("seed4_key_unavailable");return 3;}const r=await executeSeed4BatchAV1({outputDir:dir,baseInvoker:createZhipuSingleAttemptInvoker("glm-4.6v")});console.log(JSON.stringify({mode:"execute",...r}));return 0;}
if(process.argv[1]&&resolve(process.argv[1])===resolve(__filename))main().then(x=>{process.exitCode=x;}).catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
