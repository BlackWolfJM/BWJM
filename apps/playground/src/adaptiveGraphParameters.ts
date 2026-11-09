import type {
  MathMDNode, SourceRange, GraphParameterControls, GraphParameter,
} from "@mathmd/ast";
import { extractFreeParameters } from "@mathmd/math";

export type ParameterizedGraph = Extract<MathMDNode, {
  type: "plot2d" | "surface3d" | "curve3d" | "parametric2d" |
    "vectorfield2d" | "flow2d" | "calculusviz";
}>;
const TYPES: ReadonlySet<string> = new Set([
  "plot2d","surface3d","curve3d","parametric2d","vectorfield2d","flow2d","calculusviz",
]);
export function supportsAdaptiveParameters(node: MathMDNode): node is ParameterizedGraph {
  return TYPES.has(node.type);
}
/** Mathematical expressions owned by a visualization; coordinates and time are excluded. */
export function graphExpressions(node: ParameterizedGraph): string[] {
  switch(node.type) {
    case "plot2d":
    case "surface3d": return [node.equation];
    case "curve3d": return [node.x,node.y,node.z];
    case "parametric2d": return [node.x,node.y];
    case "vectorfield2d":
    case "flow2d": return [...node.field];
    case "calculusviz": return [
      node.f,node.g,node.integrand,node.paramX,node.paramY,
      node.fieldP,node.fieldQ,node.reverseLower,node.reverseUpper,
    ].filter((value):value is string=>typeof value==="string");
  }
}

export function discoverGraphParameters(node: ParameterizedGraph): GraphParameter[] {
  let names: string[] = [];
  try { names = extractFreeParameters(graphExpressions(node)); }
  catch { return []; } // malformed equations must not bring down the Studio UI
  // "n" in double integration controls integration resolution, not an independent coordinate.
  if(node.type==="calculusviz"&&!names.includes("n"))names.push("n");
  return names.slice(0,8).map(name => {
    if(name==="n") return {name,min:30,max:300,step:10,default:120,integer:true};
    if(name==="b"||name==="c")return {name,min:0.1,max:4,step:0.1,default:1};
    return {name,min:-3,max:3,step:0.1,default:1};
  });
}

/** Value aligned to the visible slider's step, with bounded numeric error. */
export function snapGraphParameter(value:number,parameter:GraphParameter):number {
  const count=Math.round((value-parameter.min)/parameter.step);
  let snapped=parameter.min+count*parameter.step;
  snapped=Math.max(parameter.min,Math.min(parameter.max,snapped));
  return Number(snapped.toPrecision(12));
}
export function validateGraphControlSettings(config:GraphParameterControls):string|null {
  if(config.parameters.length>8)return "Máximo ocho controles por gráfica.";
  const seen=new Set<string>();
  for(const p of config.parameters) {
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)||
      ["x","y","z","t","r","theta","phi","pi","e"].includes(p.name.toLowerCase())||
      seen.has(p.name))return "Nombre de parámetro inválido o repetido.";
    seen.add(p.name);
    if(![p.min,p.max,p.step,p.default].every(Number.isFinite)||
      p.max<=p.min||p.step<=0||p.default<p.min||p.default>p.max||
      Math.max(Math.abs(p.min),Math.abs(p.max))>1e6||p.step>1e6){
      return "Verifica mínimo, máximo, paso y valor inicial.";
    }
    if(p.integer&&![p.min,p.max,p.step,p.default].every(Number.isInteger))
      return "Este parámetro requiere números enteros.";
  }
  return null;
}

/** Store complete per-chart settings as a single YAML-compatible JSON inline object. */
export function writeGraphParameterControls(
  markdown:string,range:SourceRange,type:ParameterizedGraph["type"],config:GraphParameterControls,
):string {
  if(validateGraphControlSettings(config))return markdown;
  const from=range.start.offset,to=range.end.offset;
  if(!Number.isSafeInteger(from)||!Number.isSafeInteger(to)||from<0||to>markdown.length||to<=from)
    return markdown;
  const content=markdown.slice(from,to);
  const newline=content.includes("\r\n")?"\r\n":"\n";
  const fence=String.fromCharCode(96).repeat(3);
  const lines=content.split(/\r?\n/);
  if(lines[0].trim()!==fence+type||lines[lines.length-1].trim()!==fence)return markdown;
  const key=/^\s*paramControls:\s*(.*)$/;
  const found:number[]=[];
  for(let i=1;i<lines.length-1;i++)if(key.test(lines[i]))found.push(i);
  if(found.length>1)return markdown;
  // Deliberately refuse replacing multi-line YAML to avoid clobbering user-authored blocks.
  if(found.length && !key.exec(lines[found[0]])?.[1].trim())return markdown;
  const entry="paramControls: "+JSON.stringify(config);
  if(found.length)lines[found[0]]=entry;
  else lines.splice(-1,0,entry);
  return markdown.slice(0,from)+lines.join(newline)+markdown.slice(to);
}
/** Triangular bounded oscillator, deterministic and safe for expensive 3D updates. */
export function autoParameterValue(parameter:GraphParameter,elapsedMs:number,index=0):number {
  const phase=((elapsedMs/6500+index*0.17)%2+2)%2;
  const fraction=phase<=1?phase:2-phase;
  return snapGraphParameter(parameter.min+(parameter.max-parameter.min)*fraction,parameter);
}
