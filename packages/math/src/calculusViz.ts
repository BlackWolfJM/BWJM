import { compileExpression, evaluateExpression } from "./mathEngine.js";
import { computeRevolutionVolume } from "./solidRevolution.js";

export type CalculusMode = "area-dx" | "area-dy" | "area-pieces" | "area-parametric" |
  "area-polar" | "double-region" | "change-order" | "double-polar" | "revolution" | "green";

export interface CalculusSpec {
  mode: CalculusMode;
  domain: [number, number];
  f?: string; g?: string; integrand?: string;
  paramX?: string; paramY?: string;
  fieldP?: string; fieldQ?: string;
  reverseLower?: string; reverseUpper?: string;
  reverseDomain?: [number, number];
  order?: "dydx" | "dxdy";
  axis?: "x" | "y";
  axisOffset?: number;
  method?: "disks" | "washers" | "shells";
  samples?: number;
}

export interface VizPolygon { points: number[][]; fill?: string }
export interface VizCurve { points: number[][]; color?: string; label?: string }
export interface VizGuide { a: [number, number]; b: [number, number]; label?: string }
export interface VizMesh { x: number[][]; y: number[][]; z: number[][] }
export interface CalculusVizResult {
  value: number;
  valueLabel: string;
  unit: "u²" | "u³" | "valor";
  method: string;
  polygons: VizPolygon[];
  curves: VizCurve[];
  guides: VizGuide[];
  warnings: string[];
  comparison?: { label: string; value: number; difference: number };
  mesh?: VizMesh;
  innerMesh?: VizMesh;
}

type Vars = Readonly<Record<string, number>>;
type Expression = (variables: Vars) => number;

function expression(source: string | undefined, label: string): Expression {
  if (!source) throw new Error("Falta la expresión " + label);
  const compiled = compileExpression(source);
  return (variables: Vars): number => {
    const result = evaluateExpression(compiled, variables);
    if (!Number.isFinite(result)) throw new Error("Resultado no finito en " + label + "; revise singularidades y dominio.");
    return result;
  };
}
function simpson(fn: (x: number) => number, range: readonly [number, number], sections = 240): number {
  const [a, b] = range;
  if (!(Number.isFinite(a) && Number.isFinite(b) && a < b)) throw new Error("Intervalo no válido");
  const count = Math.max(24, Math.ceil(sections / 2) * 2);
  const h = (b - a) / count;
  let total = fn(a) + fn(b);
  for (let i = 1; i < count; i++) total += (i % 2 === 0 ? 2 : 4) * fn(a + h * i);
  return total * h / 3;
}
function axisEval(fn: Expression, axis: "x" | "y", t: number, scope: Vars): number {
  return fn({ ...scope, [axis]: t });
}
function samplesBetween(a: number, b: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => a + (b - a) * i / count);
}
function result(value: number, valueLabel: string, unit: CalculusVizResult["unit"], method: string): CalculusVizResult {
  return { value, valueLabel, unit, method, polygons: [], curves: [], guides: [], warnings: [] };
}
function addBoundedRegion(
  out: CalculusVizResult, lower: Expression, upper: Expression, interval: [number, number],
  scope: Vars, axis: "x" | "y", samples: number, fill = "#a5b4fc",
): void {
  const ts = samplesBetween(interval[0], interval[1], samples);
  const lo = ts.map(t => axisEval(lower, axis, t, scope));
  const hi = ts.map(t => axisEval(upper, axis, t, scope));
  if (ts.some((_, i) => hi[i] < lo[i] - 1e-8)) {
    throw new Error("La frontera superior/derecha debe estar por encima/a la derecha de la inferior/izquierda.");
  }
  const point = (t: number, value: number) => axis === "x" ? [t, value] : [value, t];
  out.polygons.push({ points: [...ts.map((t, i) => point(t, hi[i])),
    ...ts.slice().reverse().map((t, i) => point(t, lo[ts.length - 1 - i]))], fill });
  out.curves.push({ points: ts.map((t, i) => point(t, hi[i])), color: "#2563eb", label: "frontera superior/derecha" });
  out.curves.push({ points: ts.map((t, i) => point(t, lo[i])), color: "#e11d48", label: "frontera inferior/izquierda" });
  for (let i = 1; i < samples; i += Math.max(1, Math.floor(samples / 13))) {
    out.guides.push({ a: point(ts[i], lo[i]), b: point(ts[i], hi[i]) });
  }
}
function findRoots(f: Expression, g: Expression, domain: [number, number], scope: Vars): number[] {
  const segments = 360, xs = samplesBetween(domain[0], domain[1], segments);
  const diff = (x: number) => axisEval(f, "x", x, scope) - axisEval(g, "x", x, scope);
  const roots: number[] = [];
  for (let i = 0; i < segments; i++) {
    let a = xs[i], b = xs[i + 1], fa = diff(a), fb = diff(b);
    if (Math.abs(fa) < 1e-7) roots.push(a);
    if (fa * fb > 0 || fa === 0 || fb === 0) continue;
    for (let j = 0; j < 35; j++) {
      const mid = (a + b) / 2, fm = diff(mid);
      if (fa * fm <= 0) { b = mid; fb = fm; }
      else { a = mid; fa = fm; }
    }
    void fb;
    roots.push((a + b) / 2);
  }
  if (Math.abs(diff(domain[1])) < 1e-7) roots.push(domain[1]);
  return roots.sort((a, b) => a - b).filter((x, i, arr) =>
    i === 0 || x - arr[i - 1] > (domain[1] - domain[0]) * 1e-5);
}
function betweenPair(
  spec: CalculusSpec, scope: Vars, splitCrossings: boolean,
): CalculusVizResult {
  const f = expression(spec.f, "f"), g = expression(spec.g, "g");
  const axis = spec.mode === "area-dy" ? "y" : "x";
  const n = Math.min(250, Math.max(50, spec.samples ?? 120));
  const out = result(0, "Área geométrica aproximada", "u²", "Simpson compuesto por intervalos");
  const crossing = axis === "x" ? findRoots(f, g, spec.domain, scope) : [];
  const roots = splitCrossings ? crossing : [];
  const endpoints = [spec.domain[0], ...roots.filter(x => x > spec.domain[0] && x < spec.domain[1]), spec.domain[1]];
  for (let k = 0; k < endpoints.length - 1; k++) {
    const a = endpoints[k], b = endpoints[k + 1];
    if (b - a < 1e-8) continue;
    const mid = (a + b) / 2;
    const firstHigher = axisEval(f, axis, mid, scope) >= axisEval(g, axis, mid, scope);
    const upper: Expression = variables => Math.max(f(variables), g(variables));
    const lower: Expression = variables => Math.min(f(variables), g(variables));
    out.value += simpson(t => Math.abs(axisEval(f, axis, t, scope) - axisEval(g, axis, t, scope)), [a, b]);
    addBoundedRegion(out, lower, upper, [a, b], scope, axis, Math.max(20, Math.floor(n / (endpoints.length - 1))),
      splitCrossings ? (firstHigher ? "#93c5fd" : "#fda4af") : "#a5b4fc");
    if (k > 0) {
      const first: [number,number] = axis === "x" ? [a,0] : [0,a];
      const second: [number,number] = axis === "x"
        ? [a,axisEval(f,axis,a,scope)] : [axisEval(f,axis,a,scope),a];
      out.guides.push({a:first,b:second,label:"Intersección"});
    }
  }
  if (splitCrossings) {
    out.warnings.push("Las intersecciones se detectan por cambios de signo: tangencias sin cruce pueden requerir inspección.");
  } else if (axis === "x" && crossing.some(x => x > spec.domain[0] && x < spec.domain[1])) {
    out.warnings.push("Las funciones se cruzan. El valor usa |f-g|; para ver subregiones individuales, elige Área por tramos.");
  }
  return out;
}
function polarRegion(spec: CalculusSpec, scope: Vars, integrate: boolean): CalculusVizResult {
  const outer = expression(spec.f, "radio exterior"), inner = expression(spec.g, "radio interior");
  const n = Math.min(250, Math.max(80, spec.samples ?? 120));
  const angles = samplesBetween(spec.domain[0], spec.domain[1], n);
  const bounds = (theta: number): [number, number] => {
    const env = { ...scope, theta, t:theta };
    const ro = outer(env), ri = inner(env);
    if (ri < -1e-9 || ro < -1e-9 || ro < ri - 1e-9) {
      throw new Error("Se requieren radios no negativos y radio exterior ≥ radio interior en todo el intervalo.");
    }
    return [Math.max(0, ri), Math.max(0, ro)];
  };
  const toXY = (t: number, r: number) => [r * Math.cos(t), r * Math.sin(t)];
  const regions: CalculusVizResult = result(0, integrate ? "Integral doble aproximada" : "Área polar aproximada",
    integrate ? "valor" : "u²", integrate ? "Cuadratura polar con jacobiano r" : "Simpson polar");
  const outerPts = angles.map(a => toXY(a, bounds(a)[1]));
  const innerPts = angles.slice().reverse().map(a => toXY(a, bounds(a)[0]));
  regions.polygons.push({points:[...outerPts, ...innerPts], fill:"#a5b4fc"});
  regions.curves.push({points:outerPts, color:"#2563eb", label:"r exterior"});
  regions.curves.push({points:innerPts.slice().reverse(), color:"#e11d48", label:"r interior"});
  for(let i = 0; i < angles.length; i += Math.max(1, Math.floor(n / 12))) {
    const [ri,ro] = bounds(angles[i]);
    regions.guides.push({a:toXY(angles[i],ri) as [number,number],b:toXY(angles[i],ro) as [number,number]});
  }
  if (!integrate) {
    regions.value = simpson(theta => {
      const [ri, ro] = bounds(theta);
      return (ro * ro - ri * ri) / 2;
    }, spec.domain, n * 2);
  } else {
    const integrand = expression(spec.integrand ?? "1", "integrando");
    const nTheta = Math.max(45, Math.floor(n * .7)), nR = 44;
    const dTheta = (spec.domain[1] - spec.domain[0]) / nTheta;
    let total=0;
    for (let i=0;i<nTheta;i++) {
      const theta = spec.domain[0]+(i+.5)*dTheta;
      const [ri,ro]=bounds(theta), dr=(ro-ri)/nR;
      for(let j=0;j<nR;j++){
        const r=ri+(j+.5)*dr;
        total += integrand({...scope,x:r*Math.cos(theta),y:r*Math.sin(theta),r,theta})*r*dr*dTheta;
      }
    }
    regions.value=total;
  }
  regions.warnings.push("Los resultados se aproximan numéricamente; se supone que los radios describen una región sin solapamientos.");
  return regions;
}
function integrateRegion(
  low: Expression, high: Expression, domain: [number, number],
  axis: "x" | "y", integrand: Expression, scope: Vars,
  subdivisions = 75,
): { value: number; area: number } {
  const h = (domain[1] - domain[0]) / subdivisions;
  let sum=0, area=0;
  for(let i=0;i<subdivisions;i++){
    const t=domain[0]+(i+.5)*h;
    const lo=axisEval(low,axis,t,scope), hi=axisEval(high,axis,t,scope);
    if (hi < lo - 1e-9) throw new Error("Las fronteras interior superior e inferior están invertidas.");
    const step=(hi-lo)/subdivisions;
    for(let j=0;j<subdivisions;j++) {
      const u=lo+(j+.5)*step;
      const x=axis==="x"?t:u, y=axis==="x"?u:t;
      sum+=integrand({...scope,x,y})*step*h;
    }
    area+=(hi-lo)*h;
  }
  return {value:sum,area};
}
function doubleRegion(spec: CalculusSpec, scope: Vars, changeOrder: boolean): CalculusVizResult {
  const lower=expression(spec.f,"frontera inferior/izquierda");
  const upper=expression(spec.g,"frontera superior/derecha");
  const integrand=expression(spec.integrand ?? "1","integrando");
  const axis=spec.order==="dxdy"?"y":"x";
  const calc=integrateRegion(lower,upper,spec.domain,axis,integrand,scope);
  const out=result(calc.value,"Integral doble aproximada","valor","Regla del punto medio en dos dimensiones");
  addBoundedRegion(out,lower,upper,spec.domain,scope,axis,Math.min(160,spec.samples??120));
  if (changeOrder) {
    const reverseLow=expression(spec.reverseLower,"límite inverso inferior");
    const reverseUp=expression(spec.reverseUpper,"límite inverso superior");
    if(!spec.reverseDomain) throw new Error("Falta el dominio del segundo orden");
    const opposite=axis==="x"?"y":"x";
    const second=integrateRegion(reverseLow,reverseUp,spec.reverseDomain,opposite,integrand,scope);
    out.comparison={label:"Integral con orden invertido",value:second.value,difference:Math.abs(second.value-calc.value)};
    const tolerance=Math.max(0.02,Math.abs(calc.value)*0.02,Math.abs(second.value)*0.02);
    if (Math.abs(second.value-calc.value)>tolerance ||
      Math.abs(second.area-calc.area)>Math.max(.02,.02*calc.area)) {
      out.warnings.push("Los órdenes ingresados no coinciden numéricamente. Verifica límites y partición de la región.");
    }
    addBoundedRegion(out,reverseLow,reverseUp,spec.reverseDomain,scope,opposite,100,"#6ee7b7");
    out.warnings.push("Coincidencia numérica no demuestra equivalencia geométrica; comprueba que ambas descripciones sean la misma región.");
  }
  return out;
}
function parametricArea(spec: CalculusSpec, scope: Vars): CalculusVizResult {
  const x=expression(spec.paramX,"x(t)"),y=expression(spec.paramY,"y(t)");
  const count=Math.max(80,Math.min(300,spec.samples??160));
  const points=samplesBetween(spec.domain[0],spec.domain[1],count).map(t=>[
    x({...scope,t}),y({...scope,t})
  ]);
  let signed=0,backtracks=0,sign=0;
  for(let i=1;i<points.length;i++){
    const dx=points[i][0]-points[i-1][0];
    signed+=(points[i-1][1]+points[i][1])*dx/2;
    if(Math.abs(dx)>1e-8){
      const next=Math.sign(dx);
      if(sign && sign!==next)backtracks++;
      sign=next;
    }
  }
  const out=result(signed,"Área firmada ∫ y dx","u²","Trapecios paramétricos sobre el eje X");
  out.polygons.push({points:[...points,[points[points.length-1][0],0],[points[0][0],0]],fill:"#bfdbfe"});
  out.curves.push({points,color:"#2563eb",label:"(x(t), y(t))"});
  out.warnings.push("Valor firmado respecto al eje X. No tomar el valor absoluto como área geométrica para bucles o autointersecciones.");
  if(backtracks)out.warnings.push("x(t) cambia de dirección; la integral ∫y dx puede cancelar regiones.");
  return out;
}
function revolution(spec: CalculusSpec, scope: Vars): CalculusVizResult {
  const axis=spec.axis??"x", offset=spec.axisOffset??0;
  if((axis==="y")!==(spec.method==="shells")) {
    throw new Error("Cascarones para eje vertical; discos/arandelas para eje horizontal.");
  }
  const f=expression(spec.f,"f"),g=expression(spec.g,"g");
  const n=64, tCount=40;
  const xs=samplesBetween(spec.domain[0],spec.domain[1],n);
  const values=xs.map(x=>[axisEval(f,"x",x,scope),axisEval(g,"x",x,scope)]);
  const invalidVertical=axis==="y" && spec.domain[0] < offset && spec.domain[1] > offset;
  const computed=invalidVertical ? null : computeRevolutionVolume(spec.f!,spec.g!,spec.domain,{orientation:axis,offset},2*Math.PI,scope);
  const out=result(computed?.volume??Number.NaN,"Volumen aproximado","u³",
    axis==="y"?"Cascarones cilíndricos (integral numérica)":"Discos y arandelas (Simpson)");
  if(computed?.warning)out.warnings.push(computed.warning);
  if(invalidVertical)out.warnings.push("El intervalo cruza el eje vertical: los cascarones se solapan. Se omite un volumen potencialmente incorrecto.");
  if(axis==="x" && spec.method==="disks" && values.some(([a,b])=>
    !(Math.min(a,b)<=offset && offset<=Math.max(a,b)))) {
    out.warnings.push("El sólido presenta radios interiores no nulos: corresponde el método de arandelas.");
  }
  const mesh=(radius:(i:number)=>number, side:"x"|"upper"|"lower"):VizMesh=>{
    const mx:number[][]=[],my:number[][]=[],mz:number[][]=[];
    for(let j=0;j<tCount;j++){
      const theta=2*Math.PI*j/(tCount-1);
      const X:number[]=[],Y:number[]=[],Z:number[]=[];
      for(let i=0;i<xs.length;i++){
        const rr=radius(i);
        if(side==="x"){
          X.push(xs[i]);Y.push(offset+rr*Math.cos(theta));Z.push(rr*Math.sin(theta));
        }else{
          X.push(offset+rr*Math.cos(theta));Y.push(values[i][side==="upper"?0:1]);Z.push(rr*Math.sin(theta));
        }
      }
      mx.push(X);my.push(Y);mz.push(Z);
    }
    return {x:mx,y:my,z:mz};
  };
  if(axis==="x"){
    const outer=values.map(([a,b])=>Math.max(Math.abs(a-offset),Math.abs(b-offset)));
    const inner=values.map(([a,b])=>a<=offset&&offset<=b || b<=offset&&offset<=a
      ? 0:Math.min(Math.abs(a-offset),Math.abs(b-offset)));
    out.mesh=mesh(i=>outer[i],"x");
    if(inner.some(r=>r>1e-6))out.innerMesh=mesh(i=>inner[i],"x");
  }else{
    out.mesh=mesh(i=>Math.abs(xs[i]-offset),"upper");
    out.innerMesh=mesh(i=>Math.abs(xs[i]-offset),"lower");
  }
  out.curves.push({points:xs.map((x,i)=>[x,values[i][0]]),color:"#2563eb"});
  out.curves.push({points:xs.map((x,i)=>[x,values[i][1]]),color:"#e11d48"});
  out.polygons.push({points:[...xs.map((x,i)=>[x,values[i][0]]),
    ...xs.slice().reverse().map((x,i)=>[x,values[xs.length-1-i][1]])]});
  return out;
}
function polygonContains(point:[number,number],points:number[][]):boolean{
  const [x,y]=point;
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside;
}
function intersects(a:number[],b:number[],c:number[],d:number[]):boolean{
  const orient=(p:number[],q:number[],r:number[])=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  const p=orient(a,b,c),q=orient(a,b,d),r=orient(c,d,a),s=orient(c,d,b);
  return p*q < -1e-12 && r*s < -1e-12;
}
function green(spec:CalculusSpec,scope:Vars):CalculusVizResult{
  const X=expression(spec.paramX,"x(t)"),Y=expression(spec.paramY,"y(t)");
  const P=expression(spec.fieldP,"P(x,y)"),Q=expression(spec.fieldQ,"Q(x,y)");
  const count=Math.min(300,Math.max(100,spec.samples??180));
  const points=samplesBetween(spec.domain[0],spec.domain[1],count).map(t=>[X({...scope,t}),Y({...scope,t})]);
  const out=result(Number.NaN,"Circulación ∮ P dx+Q dy","valor","Integral de línea / rotacional interior numéricos");
  out.curves.push({points,color:"#2563eb",label:"frontera parametrizada"});
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),1);
  if(Math.hypot(points[0][0]-points[points.length-1][0],points[0][1]-points[points.length-1][1])>span*.012) {
    out.warnings.push("La curva no cierra dentro de la tolerancia: no se calcula Green.");
    return out;
  }
  const loop=points.slice(0,-1);
  for(let i=0;i<loop.length;i++){
    for(let j=i+2;j<loop.length;j++){
      if(i===0&&j===loop.length-1)continue;
      if(intersects(loop[i],loop[(i+1)%loop.length],loop[j],loop[(j+1)%loop.length])){
        out.warnings.push("La frontera parece autointersectarse. Green requiere una región simple o tratamiento por regiones.");
        return out;
      }
    }
  }
  let signedArea=0,line=0;
  for(let i=0;i<loop.length;i++){
    const a=loop[i],b=loop[(i+1)%loop.length];
    signedArea+=a[0]*b[1]-b[0]*a[1];
    const mid={...scope,x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};
    line+=P(mid)*(b[0]-a[0])+Q(mid)*(b[1]-a[1]);
  }
  const orientation=Math.sign(signedArea);
  if(!orientation)throw new Error("Curva degenerada: área nula.");
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const grid=90,dx=(maxX-minX)/grid,dy=(maxY-minY)/grid;
  let bulk=0;
  for(let i=0;i<grid;i++)for(let j=0;j<grid;j++){
    const x=minX+(i+.5)*dx,y=minY+(j+.5)*dy;
    if(!polygonContains([x,y],loop))continue;
    const h=1e-4*Math.max(1,span);
    const dQdx=(Q({...scope,x:x+h,y})-Q({...scope,x:x-h,y}))/(2*h);
    const dPdy=(P({...scope,x,y:y+h})-P({...scope,x,y:y-h}))/(2*h);
    bulk+=(dQdx-dPdy)*dx*dy*orientation;
  }
  out.value=line;
  out.comparison={label:"∬ (Qₓ−Pᵧ) dA (orientada)",value:bulk,difference:Math.abs(line-bulk)};
  out.polygons.push({points:loop,fill:"#a5b4fc"});
  const step=Math.max(1,Math.floor(loop.length/12));
  for(let i=0;i<loop.length;i+=step)out.guides.push({
    a:[loop[i][0],loop[i][1]],b:[loop[(i+2)%loop.length][0],loop[(i+2)%loop.length][1]],
    label:"sentido"});
  if(orientation<0)out.warnings.push("Recorrido horario: el resultado del rotacional cambia de signo.");
  out.warnings.push("Se requiere un campo C¹ en una región simple. La comparación emplea derivadas finitas y una cuadrícula aproximada.");
  return out;
}

export function computeCalculusViz(spec:CalculusSpec,scope:Vars={}):CalculusVizResult{
  if(!spec.domain||spec.domain[0]>=spec.domain[1])throw new Error("Dominio inválido");
  if(!Number.isFinite(spec.domain[0])||!Number.isFinite(spec.domain[1]))throw new Error("Dominio no finito");
  switch(spec.mode){
    case "area-dx":case "area-dy":case "area-pieces":return betweenPair(spec,scope,spec.mode==="area-pieces");
    case "area-parametric":return parametricArea(spec,scope);
    case "area-polar":return polarRegion(spec,scope,false);
    case "double-region":return doubleRegion(spec,scope,false);
    case "change-order":return doubleRegion(spec,scope,true);
    case "double-polar":return polarRegion(spec,scope,true);
    case "revolution":return revolution(spec,scope);
    case "green":return green(spec,scope);
    default:throw new Error("Modo de cálculo no implementado");
  }
}
