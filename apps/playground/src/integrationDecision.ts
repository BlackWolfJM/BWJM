export type IntegralKind = "open-line" | "planar-circulation" | "spatial-circulation" | "flux";

export interface IntegralHypothesis {
  id: string;
  label: string;
}

const regularity = {
  id: "regularity",
  label: "El campo es C¹ en un entorno de toda la región requerida, sin singularidades allí.",
};

export const integrationCases = {
  "open-line": {
    label: "Integral de línea de un campo sobre una curva abierta",
    method: "Potencial",
    formula: "∫C F · dr = φ(B) − φ(A)",
    checks: [{ id: "potential", label: "Conozco un potencial φ con ∇φ = F en un entorno de toda la trayectoria." }],
    fallback: "Parametriza la curva por tramos e integra F(r(t)) · r′(t) donde esté definida.",
  },
  "planar-circulation": {
    label: "Circulación sobre un contorno plano cerrado",
    method: "Green",
    formula: "∮C P dx + Q dy = ∬D (∂Q/∂x − ∂P/∂y) dA",
    checks: [
      { id: "boundary", label: "El contorno contiene toda la frontera de una región plana acotada. Sus componentes son curvas simples, disjuntas y regulares por tramos." },
      { id: "orientation", label: "La región queda a la izquierda al recorrer cada componente de la frontera." },
      regularity,
    ],
    fallback: "Parametriza cada tramo de C y comprueba que el campo esté definido allí.",
  },
  "spatial-circulation": {
    label: "Circulación sobre el borde de una superficie orientable",
    method: "Stokes",
    formula: "∮∂S F · dr = ∬S (∇ × F) · n dS",
    checks: [
      { id: "boundary", label: "La curva es la frontera completa de una superficie compacta, orientable y suave por tramos." },
      { id: "orientation", label: "La orientación del borde concuerda con la normal por la regla de la mano derecha." },
      regularity,
    ],
    fallback: "Parametriza el borde e integra F(r(t)) · r′(t) en cada tramo.",
  },
  flux: {
    label: "Flujo de un campo a través de una superficie",
    method: "Gauss",
    formula: "∯∂V F · n dS = ∭V (∇ · F) dV",
    checks: [
      { id: "boundary", label: "La superficie suave por tramos es la frontera cerrada y completa de un sólido acotado." },
      { id: "orientation", label: "La normal apunta hacia fuera en toda la frontera." },
      regularity,
    ],
    fallback: "Parametriza la superficie, elige la normal y calcula el flujo directamente por partes.",
  },
} satisfies Record<IntegralKind, {
  label: string;
  method: string;
  formula: string;
  checks: IntegralHypothesis[];
  fallback: string;
}>;

export function chooseIntegrationMethod(kind: IntegralKind, confirmed: readonly string[]) {
  const choice = integrationCases[kind];
  const missing = choice.checks.filter(check => !confirmed.includes(check.id));
  if (missing.length > 0) {
    return { method: "Integración directa", detail: choice.fallback, missing };
  }
  return { method: choice.method, detail: choice.formula, missing };
}
