import { createHash } from "node:crypto";
import { existsSync,mkdirSync,readFileSync,writeFileSync } from "node:fs";
import { dirname,join,resolve } from "node:path";
import { loadSeed4BatchAPlanV1 } from "./mechanismSeed4BatchAPlanV1";
import { verifyMechanismArtifactDirectoryV1 } from "./mechanismManifestV1";
import { loadMechanismTaskArtifactV1 } from "./mechanismTaskArtifactV1";
import { loadCanonicalHiddenBenchTasksV1 } from "./hiddenBenchTaskAdapter";
import { auditMechanismAttemptLedgerV1 } from "./mechanismAttemptLedgerV1";
import { bootstrapMechanismContrastV1,classifyMechanismM1V1 } from "./mechanismAnalysisMathV1";

const mean=(x:number[])=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const brier=(p:Record<string,number>,opts:string[],answer:string)=>opts.reduce((s,o)=>s+(p[o]-(o===answer?1:0))**2,0);
const top=(p:Record<string,number>,opts:string[])=>[...opts].sort((a,b)=>p[b]-p[a]||a.localeCompare(b))[0];
function canonical(v:unknown):unknown{if(v===null||typeof v!=="object")return v;if(Array.isArray(v))return v.map(canonical);return Object.fromEntries(Object.keys(v as Record<string,unknown>).sort().map(k=>[k,canonical((v as Record<string,unknown>)[k])]));}
const hash=(v:unknown)=>`sha256:${createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex")}`;
function contrast(name:"M1"|"M2"|"M3",values:number[]){return{contrast:name,n:values.length,mean:mean(values),ci95:bootstrapMechanismContrastV1(values)};}
function bounds(values:number[],missing:number,denominator:number){const s=values.reduce((a,b)=>a+b,0);return{lo:(s-2*missing)/denominator,hi:(s+2*missing)/denominator,missing};}

export function analyzeSeed4BatchAV1(inputDir:string,seed3AnalysisFile:string){
  const dir=resolve(inputDir),plan=loadSeed4BatchAPlanV1(dir),manifest=verifyMechanismArtifactDirectoryV1(dir);
  const summary=JSON.parse(readFileSync(join(dir,"summary.json"),"utf8")) as {planHash:string;executionHash:string;completedTaskIds:number[];failures:Array<{taskId:number}>;skippedTaskIds:number[];physicalAttempts:number;observedTokens:number};
  if(summary.planHash!==plan.contentHash||manifest.planHash!==plan.contentHash)throw new Error("seed4_analysis_plan_mismatch");
  const partition=[...summary.completedTaskIds,...summary.failures.map(x=>x.taskId),...summary.skippedTaskIds];if(partition.length!==plan.taskIds.length||new Set(partition).size!==plan.taskIds.length||plan.taskIds.some(x=>!partition.includes(x)))throw new Error("seed4_analysis_partition_invalid");
  const audit=auditMechanismAttemptLedgerV1(join(dir,"attempts.jsonl"));if(audit.started!==summary.physicalAttempts||audit.finished!==summary.physicalAttempts||audit.unfinishedAttemptIds.length||audit.duplicateRequestHashes.length)throw new Error("seed4_analysis_ledger_invalid");
  const data=new Map(loadCanonicalHiddenBenchTasksV1().map(x=>[x.id,x]));
  const taskResults:any[]=[];
  for(const taskId of summary.completedTaskIds){const source=data.get(taskId);if(!source)throw new Error("seed4_source_missing");const a=loadMechanismTaskArtifactV1(dir,taskId);if(a.planHash!==plan.contentHash||a.executionHash!==summary.executionHash)throw new Error("seed4_task_binding_invalid");const opts=[...source.possible_answers],answer=source.correct_answer;const r1=Object.fromEntries(opts.map(o=>[o,a.round1Snapshot.reports.reduce((s,r)=>s+r.probabilities[o],0)/a.round1Snapshot.reports.length]));const arms=Object.fromEntries(a.taskRun.arms.map(x=>[x.arm,{brier:brier(x.result.finalBelief,opts,answer),correct:top(x.result.finalBelief,opts)===answer}]));taskResults.push({taskId,round1Correct:top(r1,opts)===answer,arms,M1:arms.ATTACKS_LABELED.brier-arms.ATTACKS_NEUTRAL.brier,M2:arms.ATTACKS_NEUTRAL.brier-arms.CONTROL.brier,M3:arms.ATTACKS_LABELED.brier-arms.CONTROL.brier});}
  taskResults.sort((a,b)=>a.taskId-b.taskId);const missing=plan.taskIds.length-taskResults.length;const d1=taskResults.map(x=>x.M1),d2=taskResults.map(x=>x.M2),d3=taskResults.map(x=>x.M3);
  const seed3=JSON.parse(readFileSync(resolve(seed3AnalysisFile),"utf8")) as {taskResults:Array<{taskId:number;M1:number;M2:number;M3:number}>};const s3=new Map(seed3.taskResults.map(x=>[x.taskId,x]));const overlap=taskResults.filter(x=>s3.has(x.taskId));const combined=(k:"M1"|"M2"|"M3")=>overlap.map(x=>(x[k]+(s3.get(x.taskId) as any)[k])/2);
  const strata=Object.fromEntries([["wrong",taskResults.filter(x=>!x.round1Correct)],["correct",taskResults.filter(x=>x.round1Correct)]].map(([name,rows]:any)=>[name,{n:rows.length,M1:mean(rows.map((x:any)=>x.M1)),M2:mean(rows.map((x:any)=>x.M2)),M3:mean(rows.map((x:any)=>x.M3)),accuracy:{CONTROL:mean(rows.map((x:any)=>x.arms.CONTROL.correct?1:0)),ATTACKS_NEUTRAL:mean(rows.map((x:any)=>x.arms.ATTACKS_NEUTRAL.correct?1:0)),ATTACKS_LABELED:mean(rows.map((x:any)=>x.arms.ATTACKS_LABELED.correct?1:0))}}]));
  const body={analysisRef:{id:"swarmalpha.experiment.v6.mechanism-seed4-batch-a-analysis",version:"1.0.0"},planHash:plan.contentHash,manifestHash:manifest.contentHash,summary:{completed:taskResults.length,failed:summary.failures.length,skipped:summary.skippedTaskIds.length,physicalAttempts:summary.physicalAttempts,observedTokens:summary.observedTokens},taskResults,inference:{M1:{...contrast("M1",d1),classification:classifyMechanismM1V1(bootstrapMechanismContrastV1(d1))},M2:contrast("M2",d2),M3:contrast("M3",d3),missingBounds:{M1:bounds(d1,missing,plan.taskIds.length),M2:bounds(d2,missing,plan.taskIds.length),M3:bounds(d3,missing,plan.taskIds.length)}},strata,crossSeed:{completeBoth:overlap.length,M1:contrast("M1",combined("M1")),M2:contrast("M2",combined("M2")),M3:contrast("M3",combined("M3"))}};return{...body,contentHash:hash(body)};
}
export function writeSeed4BatchAAnalysisV1(file:string,a:any){const f=resolve(file),t=`${JSON.stringify(a,null,2)}\n`;mkdirSync(dirname(f),{recursive:true});if(existsSync(f)){if(readFileSync(f,"utf8")!==t)throw new Error("seed4_analysis_conflict");return;}writeFileSync(f,t);}
