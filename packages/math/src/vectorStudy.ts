/** Matrices y escenas vectoriales numéricas para los bloques vector2d/vector3d.
 * Las identidades verificadas con números no constituyen demostraciones generales.
 */
export type VectorStudyMode =
  | "classify" | "coordinates" | "translate" | "components"
  | "displacement" | "compare" | "sum" | "difference"
  | "scale" | "properties" | "combination";
export type VectorStudyArrow = {
  label: string; start: number[]; end: number[];
  role: "primary" | "secondary" | "result" | "guide"; dashed?: boolean;
};
export type VectorStudyStep = { title: string; expression: string; explanation: string };
export type VectorStudyResult = {
  mode: VectorStudyMode; topic: string; result: number[];
  arrows: VectorStudyArrow[]; steps: VectorStudyStep[];
  explanation: string; verification: string;
};
export type VectorStudyInput = {
  mode: VectorStudyMode; origin: readonly number[]; vector: readonly number[];
  other?: readonly number[]; third?: readonly number[];
  factor?: number; secondFactor?: number;
};
const topics: Record<VectorStudyMode,string> = {
  classify:"01.01 · Escalares y vectores", coordinates:"01.02 · Coordenadas",
  translate:"01.03 · Puntos y vectores", components:"01.04 · Componentes",
  displacement:"01.05 · Desplazamiento", compare:"01.06 · Igualdad",
  sum:"01.07 · Suma", difference:"01.07 · Resta", scale:"01.08 · Escala",
  properties:"01.09 · Propiedades", combination:"01.10 · Combinaciones y colinealidad"
};
const max = 1e9;
function finite(a: readonly number[] | undefined, n: number, name: string): number[] {
  if (!a || a.length !== n || a.some(x => !Number.isFinite(x) || Math.abs(x) > max))
    throw new RangeError(name + " debe contener " + n + " números reales finitos de magnitud ≤ 1e9.");
  return [...a];
}
function factor(k: number | undefined): number {
  const v = k ?? 1;
  if (!Number.isFinite(v) || Math.abs(v) > max) throw new RangeError("Factor no finito.");
  return v;
}
const sum=(a:readonly number[],b:readonly number[])=>a.map((x,i)=>x+b[i]);
const scale=(a:readonly number[],k:number)=>a.map(x=>x*k);
const neg=(a:readonly number[])=>a.map(x=>-x);
const diff=(a:readonly number[],b:readonly number[])=>sum(a,neg(b));
const norm=(a:readonly number[])=>Math.hypot(...a);
const num=(x:number)=>String(Object.is(x,-0)?0:Number(x.toPrecision(10)));
const vector=(a:readonly number[])=>"⟨"+a.map(num).join(", ")+"⟩";
const arr=(label:string,start:readonly number[],end:readonly number[],
  role:VectorStudyArrow["role"],dashed=false):VectorStudyArrow=>({
  label,start:[...start],end:[...end],role,dashed
});
const comp=(a:number[],b:number[],operation:"+"|"-",r:number[]):VectorStudyStep=>({
  title:"Operación componente a componente",
  expression:r.map((x,i)=>num(a[i])+" "+operation+" "+num(b[i])+" = "+num(x)).join("; "),
  explanation:"Se opera sobre cada coordenada sin mezclar las componentes."
});
/** Construye una única escena reutilizable, incluso si contiene varias flechas. */
export function computeVectorStudy(input:VectorStudyInput):VectorStudyResult {
  const n=input.vector.length;
  if (n!==2&&n!==3) throw new RangeError("Solo se admiten R² y R³.");
  const a=finite(input.vector,n,"vector"),o=finite(input.origin,n,"origin");
  const k=factor(input.factor),m=factor(input.secondFactor);
  const b=()=>finite(input.other,n,"other");
  const origin=Array<number>(n).fill(0);
  const arrows:VectorStudyArrow[]=[];
  const steps:VectorStudyStep[]=[];
  let result=[...a],explanation="",verification="";
  const primary=()=>arrows.push(arr("u",o,sum(o,a),"primary"));
  switch(input.mode) {
    case "classify":
      primary(); explanation="Un escalar tiene valor y unidad; un vector también posee dirección y sentido.";
      steps.push({title:"Distinguir magnitudes",expression:"u = "+vector(a),
        explanation:"Desplazamiento: vector. Temperatura: escalar."});
      verification="||u|| = "+num(norm(a))+" es una magnitud escalar."; break;
    case "coordinates": {
      arrows.push(arr("OP",origin,a,"primary"));
      const s=a.map(x=>x>0?"+":x<0?"-":"0");
      const quadrants:Record<string,string>={"++":"I","-+":"II","--":"III","+-":"IV"};
      explanation=n===2?(s.includes("0")?"Punto situado sobre un eje.":"Cuadrante "+quadrants[s.join("")]+".")
        :"Signos del octante (x,y,z): ("+s.join(", ")+").";
      steps.push({title:"Ubicar P",expression:"P = "+vector(a),
        explanation:"Las componentes son distancias dirigidas sobre los ejes."});
      verification="||OP|| = "+num(norm(a)); break;
    }
    case "translate":
      arrows.push(arr("u libre",origin,a,"primary"),arr("u ligado",o,sum(o,a),"secondary"));
      explanation="Al trasladar un vector libre no cambian sus componentes.";
      steps.push({title:"Traslación",expression:vector(sum(o,a))+" - "+vector(o)+" = "+vector(a),
        explanation:"El desplazamiento entre ambos extremos permanece constante."});
      verification="extremo - origen = "+vector(a); break;
    case "components": {
      primary();let p=[...o];
      for(let i=0;i<n;i++) {const q=[...p];q[i]+=a[i];
        arrows.push(arr("componente "+("xyz"[i]),p,q,"guide"));p=q;}
      explanation="Cada componente se coloca sobre su eje; las flechas se suman cabeza-cola.";
      steps.push({title:"Base canónica",expression:a.map((x,i)=>num(x)+" "+("ijk"[i])).join(" + "),
        explanation:"u es la suma de los múltiplos de los vectores canónicos."});
      verification="Suma de componentes = "+vector(a); break;
    }
    case "displacement": {
      const v=b();result=diff(v,o);
      arrows.push(arr("OA",origin,o,"guide"),arr("OB",origin,v,"secondary"),arr("B - A",o,v,"result"));
      explanation="El desplazamiento va desde A hasta B; su norma es la distancia.";
      steps.push(comp(v,o,"-",result),{title:"Distancia",expression:"||B-A|| = "+num(norm(result)),
        explanation:"La distancia euclidiana es la longitud del desplazamiento."});
      verification="A + (B - A) = "+vector(v); break;
    }
    case "compare": {
      const v=b();primary();arrows.push(arr("v",o,sum(o,v),"secondary"));
      const equal=a.every((x,i)=>x===v[i]);
      explanation=equal?"Los vectores son iguales.":"Los vectores no coinciden en todas sus componentes.";
      steps.push({title:"Comparación",expression:vector(a)+(equal?" = ":" ≠ ")+vector(v),
        explanation:"El origen puede cambiar; la igualdad requiere componentes idénticas."});
      verification="u - v = "+vector(diff(a,v)); break;
    }
    case "sum": case "difference": {
      const v=b(),term=input.mode==="sum"?v:neg(v);
      result=sum(a,term);primary();
      arrows.push(arr(input.mode==="sum"?"v":"-v",sum(o,a),sum(o,result),"secondary"),
        arr("resultante",o,sum(o,result),"result"),
        arr("paralelogramo",sum(o,term),sum(o,result),"guide",true));
      steps.push(comp(a,v,input.mode==="sum"?"+":"-",result));
      explanation="Construcción cabeza-cola y cierre del paralelogramo.";
      verification=input.mode==="sum"?"(u+v)-v = "+vector(a):"(u-v)+v = "+vector(a); break;
    }
    case "scale": {
      result=scale(a,k);primary();arrows.push(arr("k u",o,sum(o,result),"result"));
      const describeEffect = (scalar: number) => {
        if (scalar === 0 || a.every(component => component === 0)) {
          return "El producto es el vector nulo y no tiene dirección ni sentido.";
        }
        return scalar < 0 ? "El sentido se invierte." : "El sentido se conserva.";
      };
      explanation = describeEffect(k);
      steps.push({title:"Multiplicación escalar",expression:num(k)+" · "+vector(a)+" = "+vector(result),
        explanation:"Multiplica cada componente por el mismo número k."});
      for (const sample of [-1, 0, 1]) {
        const product = scale(a, sample);
        steps.push({
          title: "Comparación con k = " + sample,
          expression: vector(product) + " · norma " + num(norm(product)),
          explanation: describeEffect(sample),
        });
      }
      verification="||k u|| = "+num(norm(result))+"; |k| ||u|| = "+num(Math.abs(k)*norm(a)); break;
    }
    case "properties": {
      const v=b(),w=finite(input.third??a,n,"third");result=sum(a,v);
      primary();arrows.push(arr("v",sum(o,a),sum(o,result),"secondary"),arr("u+v",o,sum(o,result),"result"));
      steps.push(
        {title:"Conmutatividad",expression:vector(sum(a,v))+" = "+vector(sum(v,a)),explanation:"u+v=v+u."},
        {title:"Asociatividad",expression:vector(sum(sum(a,v),w))+" = "+vector(sum(a,sum(v,w))),explanation:"(u+v)+w=u+(v+w)."},
        {title:"Distributividad",expression:vector(scale(sum(a,v),k))+" = "+vector(sum(scale(a,k),scale(v,k))),
          explanation:"k(u+v)=ku+kv."});
      explanation="Comprobación numérica para estos datos; no es una demostración general.";
      verification="Las identidades se justifican por las propiedades de los números reales.";break;
    }
    case "combination": {
      const v=b(),ka=scale(a,k),mv=scale(v,m);result=sum(ka,mv);
      arrows.push(arr("k u",o,sum(o,ka),"primary"),arr("m v",sum(o,ka),sum(o,result),"secondary"),
        arr("resultado",o,sum(o,result),"result"));
      const area=n===2?Math.abs(a[0]*v[1]-a[1]*v[0]):
        norm([a[1]*v[2]-a[2]*v[1],a[2]*v[0]-a[0]*v[2],a[0]*v[1]-a[1]*v[0]]);
      const tol=1e-10*Math.max(1,norm(a)*norm(v));
      steps.push({title:"Combinación",expression:num(k)+"u + "+num(m)+"v = "+vector(result),
        explanation:"Los factores afectan independientemente a cada vector."},
        {title:"Colinealidad",expression:"Área (det/cross) = "+num(area),
          explanation:"Área cero implica dependencia; los decimales se comparan con una tolerancia."});
      explanation=area<=tol?"Vectores colineales o numéricamente colineales.":"Vectores no colineales.";
      verification="Tolerancia aplicada a la prueba = "+num(tol)+"; incluye el vector cero.";break;
    }
    default:throw new Error("Modo vectorial desconocido.");
  }
  for(const v of [result,...arrows.flatMap(a=>[a.start,a.end])]) {
    if(v.some(x=>!Number.isFinite(x)||Math.abs(x)>max))
      throw new RangeError("El resultado supera los límites seguros (±1e9).");
  }
  return {mode:input.mode,topic:topics[input.mode],result,arrows,steps,explanation,verification};
}
