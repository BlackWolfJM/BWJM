import React, { useMemo, useState } from "react";
import type { CalculusVizMode } from "@mathmd/ast";
import { compileExpression, evaluateExpression } from "@mathmd/math";

type Field = { key: string; label: string; options?: string[] };
interface Template {
  mode: CalculusVizMode;
  label: string;
  help: string;
  formula: string;
  values: Record<string,string>;
  fields: Field[];
}
const limits: Field[] = [{key:"a",label:"Límite inicial"},{key:"b",label:"Límite final"}];
const templates: Template[] = [
 { mode:"area-dx",label:"01 · Área entre curvas — dx",
   help:"Cortes verticales; integra la diferencia absoluta entre curvas.",
   formula:"A = ∫ₐᵇ |f(x)−g(x)| dx",values:{f:"2*x",g:"x^2",a:"0",b:"2"},
   fields:[{key:"f",label:"y = f(x)"},{key:"g",label:"y = g(x)"},...limits] },
 { mode:"area-dy",label:"02 · Área entre curvas — dy",
   help:"Cortes horizontales: escribe las funciones como x=f(y) y x=g(y).",
   formula:"A = ∫cᵈ |f(y)−g(y)| dy",values:{f:"y^2",g:"2*y",a:"0",b:"2"},
   fields:[{key:"f",label:"x = f(y)"},{key:"g",label:"x = g(y)"},...limits] },
 { mode:"area-pieces",label:"03 · Área entre curvas por tramos",
   help:"Colorea por subintervalos separados en cruces de las funciones.",
   formula:"A = Σᵢ ∫ |f(x)−g(x)| dx",values:{f:"x",g:"x^3",a:"-1",b:"1"},
   fields:[{key:"f",label:"y = f(x)"},{key:"g",label:"y = g(x)"},...limits] },
 { mode:"area-parametric",label:"04 · Área firmada paramétrica",
   help:"Proyección firmada respecto a X; los retrocesos pueden cancelar áreas.",
   formula:"A_firmada = ∫ y(t) x′(t) dt",
   values:{paramX:"t-sin(t)",paramY:"1-cos(t)",a:"0",b:"2*pi"},
   fields:[{key:"paramX",label:"x(t)"},{key:"paramY",label:"y(t)"},
     {key:"a",label:"t inicial"},{key:"b",label:"t final"}] },
 { mode:"area-polar",label:"05 · Área polar y lóbulos",
   help:"Radio exterior ≥ radio interior ≥ 0; selecciona el sector angular.",
   formula:"A = ½ ∫ (r_ext²−r_int²) dθ",
   values:{f:"1+cos(theta)",g:"0",a:"0",b:"2*pi"},
   fields:[{key:"f",label:"r exterior(θ)"},{key:"g",label:"r interior(θ)"},
     {key:"a",label:"θ inicial (rad)"},{key:"b",label:"θ final (rad)"}] },
 { mode:"double-region",label:"06 · Integral doble Tipo I / II",
   help:"Tipo I usa dy dx; Tipo II utiliza dx dy. La integral sombreada se aproxima numéricamente.",
   formula:"∬ᴰ h(x,y) dA",
   values:{f:"x^2",g:"x",integrand:"x+y",a:"0",b:"1",order:"dydx"},
   fields:[{key:"order",label:"Tipo",options:["dydx","dxdy"]},
     {key:"f",label:"Frontera inferior/izquierda"},
     {key:"g",label:"Frontera superior/derecha"},
     {key:"integrand",label:"Integrando h(x,y)"},...limits] },
 { mode:"change-order",label:"07 · Cambio de orden de integración",
   help:"Introduce los límites originales e invertidos; el sistema compara ambas integrales.",
   formula:"∫ dx ∫ dy h = ∫ dy ∫ dx h",
   values:{f:"x^2",g:"x",integrand:"1",a:"0",b:"1",reverseLower:"y",reverseUpper:"sqrt(y)",reverseA:"0",reverseB:"1"},
   fields:[{key:"f",label:"y inferior = f(x)"},{key:"g",label:"y superior = g(x)"},
     {key:"integrand",label:"Integrando h(x,y)"},...limits,
     {key:"reverseLower",label:"x izquierda = m(y)"},
     {key:"reverseUpper",label:"x derecha = M(y)"},
     {key:"reverseA",label:"Nuevo mínimo de y"},{key:"reverseB",label:"Nuevo máximo de y"}] },
 { mode:"double-polar",label:"08 · Integral doble en coordenadas polares",
   help:"Sustituye x=r cos θ, y=r sin θ y aplica el jacobiano r.",
   formula:"∫∫ h(r cos θ,r sin θ) r dr dθ",
   values:{f:"1",g:"0",integrand:"x^2+y^2",a:"0",b:"2*pi"},
   fields:[{key:"f",label:"r exterior(θ)"},{key:"g",label:"r interior(θ)"},
     {key:"integrand",label:"Integrando h(x,y)"},
     {key:"a",label:"θ inicial (rad)"},{key:"b",label:"θ final (rad)"}] },
 { mode:"revolution",label:"09 · Sólidos: discos, arandelas o cascarones",
   help:"Eje X: discos/arandelas; eje Y: cascarones. Se calculan volúmenes aproximados.",
   formula:"V = π∫(R²−r²)dx  o  2π∫radio·altura dx",
   values:{f:"x",g:"0",a:"0",b:"1",axis:"x",method:"disks",axisOffset:"0"},
   fields:[{key:"f",label:"Curva superior y=f(x)"},{key:"g",label:"Curva inferior y=g(x)"},
     ...limits,{key:"axis",label:"Eje de giro",options:["x","y"]},
     {key:"axisOffset",label:"Desplazamiento del eje"},
     {key:"method",label:"Método",options:["disks","washers","shells"]}] },
 { mode:"green",label:"10 · Integral de línea / teorema de Green",
   help:"Curva cerrada y simple, campo C¹; compara circulación y rotacional interior.",
   formula:"∮ P dx + Q dy = ∬ (Qₓ−Pᵧ) dA",
   values:{paramX:"cos(t)",paramY:"sin(t)",fieldP:"-y/2",fieldQ:"x/2",a:"0",b:"2*pi"},
   fields:[{key:"paramX",label:"Contorno x(t)"},{key:"paramY",label:"Contorno y(t)"},
     {key:"fieldP",label:"P(x,y)"},{key:"fieldQ",label:"Q(x,y)"},
     {key:"a",label:"t inicial"},{key:"b",label:"t final"}] },
];

function parseConstant(input: string): number {
  try {
    const result = evaluateExpression(compileExpression(input), {});
    return Number.isFinite(result) ? result : Number.NaN;
  } catch { return Number.NaN; }
}
interface Props { onInsert: (block: string) => void }
export const CalculusWizard: React.FC<Props> = ({onInsert}) => {
  const [mode,setMode]=useState<CalculusVizMode>("area-dx");
  const [values,setValues]=useState<Record<string,string>>({...templates[0].values});
  const template=templates.find(option=>option.mode===mode)??templates[0];
  const aValue=parseConstant(values.a??"");
  const bValue=parseConstant(values.b??"");
  const reverseAValue=parseConstant(values.reverseA??"");
  const reverseBValue=parseConstant(values.reverseB??"");
  const axisOffsetValue=parseConstant(values.axisOffset??"0");
  const invalidDomain=!Number.isFinite(aValue) || !Number.isFinite(bValue) || aValue>=bValue;
  const invalidReverse=mode==="change-order" &&
    (!Number.isFinite(reverseAValue)||!Number.isFinite(reverseBValue)||reverseAValue>=reverseBValue);
  const invalidAxis=mode==="revolution" && (
    (values.axis==="y"&&values.method!=="shells")||
    (values.axis==="x"&&values.method==="shells"));
  const invalidOffset=mode==="revolution"&&!Number.isFinite(axisOffsetValue);
  const invalidExpr=template.fields.some(field=>!field.options &&
    !["a","b","reverseA","reverseB","axisOffset"].includes(field.key)&&
    !values[field.key]?.trim());
  const error=invalidDomain?"Escribe límites válidos (admite pi y 2*pi) y un final mayor al inicio.":
    invalidReverse?"Los límites del segundo orden no son válidos.":
    invalidAxis?"Cascarones con eje Y; discos o arandelas con eje X.":
    invalidOffset?"Desplazamiento del eje inválido.":
    invalidExpr?"Completa todas las expresiones necesarias.":null;

  const generated=useMemo(()=>{
    const fence=String.fromCharCode(96).repeat(3);
    const lines=[fence+"calculusviz","mode: "+mode,
      "domain: ["+aValue+", "+bValue+"]","samples: 160"];
    ["f","g","integrand","paramX","paramY","fieldP","fieldQ","reverseLower","reverseUpper"]
      .forEach(key=>{if(values[key]&&template.fields.some(field=>field.key===key)) {
        lines.push(key+": "+JSON.stringify(values[key]));
      }});
    if(mode==="double-region")lines.push("order: "+values.order);
    if(mode==="change-order")lines.push("order: dydx",
      "reverseDomain: ["+reverseAValue+", "+reverseBValue+"]");
    if(mode==="revolution")lines.push("axis: "+values.axis,
      "method: "+values.method,"axisOffset: "+axisOffsetValue);
    return [...lines,fence].join("\n");
  },[mode,values,template,aValue,bValue,reverseAValue,reverseBValue,axisOffsetValue]);

  return <section className="bwjm-calculus-wizard" aria-label="Asistente de cálculo integral">
    <header className="bwjm-calculus-wizard-header">
      <label htmlFor="bwjm-calculus-method">Método según el tipo de ejercicio</label>
      <select id="bwjm-calculus-method" value={mode} onChange={event=>{
        const next=event.target.value as CalculusVizMode;
        const item=templates.find(option=>option.mode===next);
        if(item){setMode(next);setValues({...item.values});}
      }}>
        {templates.map(item=><option key={item.mode} value={item.mode}>{item.label}</option>)}
      </select>
      <p>{template.help}</p>
      <div className="bwjm-calculus-formula">{template.formula}</div>
    </header>
    <div className="bwjm-calculus-fields">
      {template.fields.map(field=><label className="bwjm-calculus-field" key={field.key}>
        <span>{field.label}</span>
        {field.options?
          <select value={values[field.key]??field.options[0]} onChange={event=>{
            const value=event.target.value;
            setValues(old=>({...old,[field.key]:value,...(field.key==="axis"?
              {method:value==="y"?"shells":"washers"}:{})}));
          }}>
            {field.options.map(option=><option key={option} value={option}>{
              option==="dydx"?"Tipo I (dy dx)":option==="dxdy"?"Tipo II (dx dy)":
              option==="disks"?"Discos":option==="washers"?"Arandelas":
              option==="shells"?"Cascarones":option==="x"?"Horizontal X":
              option==="y"?"Vertical Y":option
            }</option>)}
          </select>
        :<input type="text" spellCheck={false} value={values[field.key]??""}
          onChange={event=>setValues(old=>({...old,[field.key]:event.target.value}))}/>}
      </label>)}
    </div>
    <div className="bwjm-calculus-code">
      <strong>Bloque .bwjm generado</strong>
      <pre><code>{generated}</code></pre>
    </div>
    {error&&<p className="bwjm-calculus-error" role="alert">{error}</p>}
    <div className="bwjm-calculus-controls">
      <small>Resultados numéricos aproximados; se mostrarán advertencias sobre dominio y método.</small>
      <button type="button" disabled={!!error}
        onClick={()=>onInsert("\n"+generated+"\n")}>Insertar gráfico y cálculo</button>
    </div>
  </section>;
};
