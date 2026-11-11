/**
 * Operaciones vectoriales básicas en ℝ² y ℝ³ para BWJM Studio.
 * Funciones puras, testeables, sin dependencias de React.
 */

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];

export function isFiniteVector(v: readonly number[], n: number): boolean {
  return v.length === n && v.every(x => Number.isFinite(x));
}

/**
 * Producto cruz en ℝ³.
 * Devuelve [0,0,0] si los vectores son paralelos o uno es nulo.
 * No normaliza.
 */
export function crossProduct(a: Vector3, b: Vector3): Vector3 {
  const [a1, a2, a3] = a;
  const [b1, b2, b3] = b;
  return [
    a2 * b3 - a3 * b2,
    a3 * b1 - a1 * b3,
    a1 * b2 - a2 * b1,
  ];
}

/**
 * Magnitud del producto cruz = área del paralelogramo.
 */
export function crossMagnitude(a: Vector3, b: Vector3): number {
  const c = crossProduct(a, b);
  return Math.hypot(c[0], c[1], c[2]);
}

export interface CrossProductAreaInfo {
  area: number;
  triangleArea: number;
  magU: number;
  magV: number;
  sinTheta: number;
  cosTheta: number;
  thetaRad: number;
  thetaDeg: number;
  isParallel: boolean;
  isZero: boolean;
  formula: string;
  triangleFormula: string;
  origin?: Vector3;
  exact?: {
    radicand: string;
    parallelogram: string;
    triangle: string;
    substitution: string;
    check: string;
    translation: string;
  };
}

function formatAreaNumber(value: number, decimalPlaces: number): string {
  return value !== 0 && Math.abs(value) < 10 ** -decimalPlaces
    ? String(Number(value.toPrecision(5)))
    : value.toFixed(decimalPlaces);
}

/**
 * Calcula el área del paralelogramo generado por u y v y del triángulo sustentado (área / 2).
 * Protege estrictamente contra división por cero si alguna magnitud es nula.
 * Anula el área si los vectores son colineales/paralelos.
 * Admite origen trasladado conservando invariantes las áreas y magnitudes.
 */
export function computeCrossProductArea(
  u: Vector3,
  v: Vector3,
  origin?: Vector3,
  scene = computeCrossProductScene(u, v, false, undefined, origin),
): CrossProductAreaInfo {
  const orig: Vector3 | undefined = origin && isFiniteVector(origin, 3) ? origin : undefined;
  const magU = Math.hypot(...u);
  const magV = Math.hypot(...v);

  if (scene.error !== undefined) {
    return {
      area: 0,
      triangleArea: 0,
      magU: Number.isFinite(magU) ? magU : 0,
      magV: Number.isFinite(magV) ? magV : 0,
      sinTheta: 0,
      cosTheta: 1,
      thetaRad: 0,
      thetaDeg: 0,
      isParallel: true,
      isZero: false,
      formula: "Fuera de rango numérico",
      triangleFormula: "Fuera de rango numérico",
      ...(orig ? { origin: orig } : {}),
    };
  }

  const exact = describeExactCrossProductArea(u, v, orig);
  if (magU === 0 || magV === 0) {
    return {
      area: 0,
      triangleArea: 0,
      magU,
      magV,
      sinTheta: 0,
      cosTheta: 1,
      thetaRad: 0,
      thetaDeg: 0,
      isParallel: true,
      isZero: true,
      formula: "‖u‖ · ‖v‖ · sen(θ) = 0 (magnitud nula)",
      triangleFormula: "1/2 · ‖u‖ · ‖v‖ · sen(θ) = 0 (magnitud nula)",
      ...(orig ? { origin: orig } : {}),
      ...(exact ? { exact } : {}),
    };
  }

  // Normalizing by the largest component avoids products of very small or large magnitudes.
  const a = unitVector(u);
  const b = unitVector(v);
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const { area, triangleArea } = scene;
  const isPar = scene.opposite === null;
  const cosTheta = isPar ? Math.sign(dot) : Math.max(-1, Math.min(1, dot));
  const sinTheta = isPar ? 0 : Math.min(1, crossMagnitude(a, b));
  const thetaRad = Math.atan2(sinTheta, cosTheta);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  const formula = isPar
    ? "‖u‖ · ‖v‖ · sen(θ) = 0 (vectores paralelos, sen(θ) = 0)"
    : Number.isFinite(magU) && Number.isFinite(magV)
      ? `‖u‖ · ‖v‖ · sen(θ) ≈ ${formatAreaNumber(magU, 3)} · ${formatAreaNumber(magV, 3)} · ${formatAreaNumber(sinTheta, 4)} ≈ ${formatAreaNumber(area, 3)}`
      : `‖u × v‖ ≈ ${formatAreaNumber(area, 3)} (magnitudes de entrada fuera de rango numérico)`;
  const triangleFormula = isPar
    ? "1/2 · ‖u‖ · ‖v‖ · sen(θ) = 0 (vectores paralelos, sen(θ) = 0)"
    : `1/2 · ‖u × v‖ ≈ 1/2 · ${formatAreaNumber(area, 3)} ≈ ${formatAreaNumber(triangleArea, 3)}`;

  return {
    area,
    triangleArea,
    magU: Number.isFinite(magU) ? magU : 0,
    magV: Number.isFinite(magV) ? magV : 0,
    sinTheta,
    cosTheta,
    thetaRad,
    thetaDeg,
    isParallel: isPar,
    isZero: false,
    formula,
    triangleFormula,
    ...(orig ? { origin: orig } : {}),
    ...(exact ? { exact } : {}),
  };
}

export interface AnticommutativityInfo {
  directOperation: string;
  reverseOperation: string;
  directNormal: Vector3;
  oppositeNormal: Vector3;
  isNegationExact: boolean;
  isZero: boolean;
  identityLatex: string;
  explanation: string;
}

export function computeCrossProductAnticommutativity(
  u: Vector3,
  v: Vector3,
  reverseOrder = false,
): AnticommutativityInfo {
  const directOp = reverseOrder ? "v × u" : "u × v";
  const reverseOp = reverseOrder ? "u × v" : "v × u";
  const directN = reverseOrder ? crossProduct(v, u) : crossProduct(u, v);
  const oppN: Vector3 = [
    directN[0] === 0 ? 0 : -directN[0],
    directN[1] === 0 ? 0 : -directN[1],
    directN[2] === 0 ? 0 : -directN[2],
  ];
  const isZero = directN.every(c => Math.abs(c) <= 1e-12);
  const reverseN = reverseOrder ? crossProduct(u, v) : crossProduct(v, u);
  const diff = [reverseN[0] - oppN[0], reverseN[1] - oppN[1], reverseN[2] - oppN[2]];
  const isNegationExact = Math.hypot(...diff) <= 1e-11;
  const identityLatex = reverseOrder
    ? "u \\times v = -(v \\times u)"
    : "v \\times u = -(u \\times v)";
  const explanation = isZero
    ? "Los vectores son colineales o nulos. El producto cruz directo y su inverso son ambos nulos: el vector cero coincide con su opuesto."
    : `El intercambio de operandos invierte el sentido de la normal: ${reverseOp} = -(${directOp}). En términos de determinantes, intercambiar dos filas multiplica el determinante por -1.`;
  return {
    directOperation: directOp,
    reverseOperation: reverseOp,
    directNormal: directN,
    oppositeNormal: oppN,
    isNegationExact,
    isZero,
    identityLatex,
    explanation,
  };
}

export interface DistributivityInfo {
  u: Vector3;
  v: Vector3;
  w: Vector3;
  vPlusW: Vector3;
  uCrossV: Vector3;
  uCrossW: Vector3;
  uCrossSum: Vector3;
  sumOfCrosses: Vector3;
  difference: Vector3;
  isDistributive: boolean;
  expressionLeft: string;
  expressionRight: string;
  explanation: string;
}

export function computeCrossProductDistributivity(
  u: Vector3,
  v: Vector3,
  w: Vector3,
): DistributivityInfo {
  const vPlusW: Vector3 = [v[0] + w[0], v[1] + w[1], v[2] + w[2]];
  const uCrossV = crossProduct(u, v);
  const uCrossW = crossProduct(u, w);
  const uCrossSum = crossProduct(u, vPlusW);
  const sumOfCrosses: Vector3 = [
    uCrossV[0] + uCrossW[0],
    uCrossV[1] + uCrossW[1],
    uCrossV[2] + uCrossW[2],
  ];
  const difference: Vector3 = [
    uCrossSum[0] - sumOfCrosses[0],
    uCrossSum[1] - sumOfCrosses[1],
    uCrossSum[2] - sumOfCrosses[2],
  ];
  const isDistributive = Math.hypot(...difference) <= 1e-11;
  const explanation = isDistributive
    ? "El producto cruz es distributivo respecto a la suma vectorial: u × (v + w) = (u × v) + (u × w). Esta propiedad se deriva de la linealidad del determinante por filas."
    : "Discrepancia numérica observada en la expansión distributiva.";
  return {
    u,
    v,
    w,
    vPlusW,
    uCrossV,
    uCrossW,
    uCrossSum,
    sumOfCrosses,
    difference,
    isDistributive,
    expressionLeft: "u × (v + w)",
    expressionRight: "(u × v) + (u × w)",
    explanation,
  };
}

export interface SymbolicIdentityProof {
  id: "anticommutativity" | "selfCross" | "scalarAssociativity" | "distributivity";
  name: string;
  latexFormula: string;
  leftExpression: string;
  rightExpression: string;
  leftEvaluated: Vector3;
  rightEvaluated: Vector3;
  isExactMatch: boolean;
  passed: boolean;
  residualNorm: number;
  steps: Array<{
    title: string;
    expression: string;
    explanation: string;
  }>;
  scalarDotWarning: string;
}

export interface CrossProductIdentityReport {
  identities: SymbolicIdentityProof[];
  proofs: SymbolicIdentityProof[];
  allPassed: boolean;
  summary: string;
  scalarWarning: string;
}

export function inspectCrossProductIdentities(
  u: Vector3,
  v: Vector3,
  w?: Vector3,
  scalar = 2,
): CrossProductIdentityReport {
  const vecW: Vector3 = w && isFiniteVector(w, 3) ? w : [0, 1, 1];
  const vectorText = (vector: Vector3) => "(" + vector.map(formatComponent).join(", ") + ")";

  // 1. Anticommutativity: u × v = -(v × u)
  const uCrossV = crossProduct(u, v);
  const vCrossU = crossProduct(v, u);
  const negVCrossU: Vector3 = [
    vCrossU[0] === 0 ? 0 : -vCrossU[0],
    vCrossU[1] === 0 ? 0 : -vCrossU[1],
    vCrossU[2] === 0 ? 0 : -vCrossU[2],
  ];
  const antiDiff: Vector3 = [uCrossV[0] - negVCrossU[0], uCrossV[1] - negVCrossU[1], uCrossV[2] - negVCrossU[2]];
  const antiRes = Math.hypot(...antiDiff);
  const antiProof: SymbolicIdentityProof = {
    id: "anticommutativity",
    name: "Anticonmutatividad",
    latexFormula: "\\mathbf{u} \\times \\mathbf{v} = -(\\mathbf{v} \\times \\mathbf{u})",
    leftExpression: "u × v",
    rightExpression: "-(v × u)",
    leftEvaluated: uCrossV,
    rightEvaluated: negVCrossU,
    isExactMatch: antiRes <= 1e-11,
    passed: antiRes <= 1e-11,
    residualNorm: antiRes,
    steps: [
      {
        title: "Datos y condiciones",
        expression: `u = ${vectorText(u)}; v = ${vectorText(v)}`,
        explanation: "Vectores tridimensionales en base canónica {i, j, k}.",
      },
      {
        title: "Expansión lado izquierdo (u × v)",
        expression: `u × v = (${formatFactor(u[1])}·${formatFactor(v[2])} − ${formatFactor(u[2])}·${formatFactor(v[1])}, ${formatFactor(u[2])}·${formatFactor(v[0])} − ${formatFactor(u[0])}·${formatFactor(v[2])}, ${formatFactor(u[0])}·${formatFactor(v[1])} − ${formatFactor(u[1])}·${formatFactor(v[0])}) = ${vectorText(uCrossV)}`,
        explanation: "Determinante formal con la primera fila u y la segunda fila v.",
      },
      {
        title: "Expansión lado derecho -(v × u)",
        expression: `-(v × u) = -((${formatFactor(v[1])}·${formatFactor(u[2])} − ${formatFactor(v[2])}·${formatFactor(u[1])}, ${formatFactor(v[2])}·${formatFactor(u[0])} − ${formatFactor(v[0])}·${formatFactor(u[2])}, ${formatFactor(v[0])}·${formatFactor(u[1])} − ${formatFactor(v[1])}·${formatFactor(u[0])})) = -${vectorText(vCrossU)} = ${vectorText(negVCrossU)}`,
        explanation: "Permutar las dos filas del determinante invierte su signo por las propiedades del determinante multilineal alternado.",
      },
      {
        title: "Comprobación y balance",
        expression: `(u × v) + (v × u) = ${vectorText(antiDiff)}`,
        explanation: antiRes <= 1e-11
          ? "Identidad anticonmutativa verificada exactamente: la suma de ambos términos se anula a cero."
          : "Discrepancia en la identidad anticonmutativa.",
      },
    ],
    scalarDotWarning: "El producto cruz es anticonmutativo: u × v = -(v × u) ∈ ℝ³. No confundir con el producto escalar: u · v es un escalar conmutativo en ℝ (u · v = v · u).",
  };

  // 2. Nilpotency / Self-cross: u × u = 0
  const uCrossU = crossProduct(u, u);
  const selfRes = Math.hypot(...uCrossU);
  const selfProof: SymbolicIdentityProof = {
    id: "selfCross",
    name: "Autoproducto / Nilpotencia",
    latexFormula: "\\mathbf{u} \\times \\mathbf{u} = \\mathbf{0}",
    leftExpression: "u × u",
    rightExpression: "(0, 0, 0)",
    leftEvaluated: uCrossU,
    rightEvaluated: [0, 0, 0],
    isExactMatch: selfRes <= 1e-11,
    passed: selfRes <= 1e-11,
    residualNorm: selfRes,
    steps: [
      {
        title: "Datos",
        expression: `u = ${vectorText(u)}`,
        explanation: "Vector operado consigo mismo en producto vectorial.",
      },
      {
        title: "Expansión simbólica",
        expression: `u × u = (${formatFactor(u[1])}·${formatFactor(u[2])} − ${formatFactor(u[2])}·${formatFactor(u[1])}, ${formatFactor(u[2])}·${formatFactor(u[0])} − ${formatFactor(u[0])}·${formatFactor(u[2])}, ${formatFactor(u[0])}·${formatFactor(u[1])} − ${formatFactor(u[1])}·${formatFactor(u[0])}) = ${vectorText(uCrossU)}`,
        explanation: "Cada componente es la diferencia de dos términos idénticos (u_i u_j - u_j u_i = 0).",
      },
      {
        title: "Justificación geométrica",
        expression: `‖u × u‖ = ‖u‖·‖u‖·sen(0°) = 0`,
        explanation: "El ángulo entre un vector y sí mismo es θ = 0 rad, sen(0) = 0 y el área del paralelogramo colapsa a 0.",
      },
    ],
    scalarDotWarning: "Para cualquier vector u, u × u = (0, 0, 0). En contraste, para el producto escalar u · u = ‖u‖² (norma euclidiana al cuadrado, nunca nula a menos que u sea el vector cero).",
  };

  // 3. Scalar Associativity: (c u) × v = c (u × v)
  const cu: Vector3 = [scalar * u[0], scalar * u[1], scalar * u[2]];
  const cuCrossV = crossProduct(cu, v);
  const cTimesCross: Vector3 = [scalar * uCrossV[0], scalar * uCrossV[1], scalar * uCrossV[2]];
  const scalarDiff: Vector3 = [cuCrossV[0] - cTimesCross[0], cuCrossV[1] - cTimesCross[1], cuCrossV[2] - cTimesCross[2]];
  const scalarRes = Math.hypot(...scalarDiff);
  const scalarProof: SymbolicIdentityProof = {
    id: "scalarAssociativity",
    name: "Homogeneidad y asociatividad escalar",
    latexFormula: "(c\\mathbf{u}) \\times \\mathbf{v} = c(\\mathbf{u} \\times \\mathbf{v})",
    leftExpression: `(${scalar}u) × v`,
    rightExpression: `${scalar}(u × v)`,
    leftEvaluated: cuCrossV,
    rightEvaluated: cTimesCross,
    isExactMatch: scalarRes <= 1e-11,
    passed: scalarRes <= 1e-11,
    residualNorm: scalarRes,
    steps: [
      {
        title: "Datos y escalar",
        expression: `u = ${vectorText(u)}; v = ${vectorText(v)}; c = ${scalar}`,
        explanation: "Escalado de uno de los operandos del producto cruz.",
      },
      {
        title: "Lado izquierdo (c u) × v",
        expression: `(${scalar}u) = ${vectorText(cu)} ⇒ (${scalar}u) × v = ${vectorText(cuCrossV)}`,
        explanation: "El escalar multiplica la primera fila del determinante antes del producto.",
      },
      {
        title: "Lado derecho c (u × v)",
        expression: `${scalar} · (u × v) = ${scalar} · ${vectorText(uCrossV)} = ${vectorText(cTimesCross)}`,
        explanation: "Por linealidad del determinante, factorizar un escalar común de una fila equivale a multiplicar el determinante por dicho escalar.",
      },
    ],
    scalarDotWarning: "El producto cruz es homogéneo: (c u) × v = c (u × v). En el producto escalar también se cumple (c u) · v = c (u · v), pero el resultado es un número real, no un vector.",
  };

  // 4. Distributivity over addition: u × (v + w) = (u × v) + (u × w)
  const vPlusW: Vector3 = [v[0] + vecW[0], v[1] + vecW[1], v[2] + vecW[2]];
  const uCrossVPlusW = crossProduct(u, vPlusW);
  const uCrossW = crossProduct(u, vecW);
  const sumCrosses: Vector3 = [uCrossV[0] + uCrossW[0], uCrossV[1] + uCrossW[1], uCrossV[2] + uCrossW[2]];
  const distDiff: Vector3 = [uCrossVPlusW[0] - sumCrosses[0], uCrossVPlusW[1] - sumCrosses[1], uCrossVPlusW[2] - sumCrosses[2]];
  const distRes = Math.hypot(...distDiff);
  const distProof: SymbolicIdentityProof = {
    id: "distributivity",
    name: "Distributividad respecto a la suma vectorial",
    latexFormula: "\\mathbf{u} \\times (\\mathbf{v} + \\mathbf{w}) = (\\mathbf{u} \\times \\mathbf{v}) + (\\mathbf{u} \\times \\mathbf{w})",
    leftExpression: "u × (v + w)",
    rightExpression: "(u × v) + (u × w)",
    leftEvaluated: uCrossVPlusW,
    rightEvaluated: sumCrosses,
    isExactMatch: distRes <= 1e-11,
    passed: distRes <= 1e-11,
    residualNorm: distRes,
    steps: [
      {
        title: "Datos de tres vectores",
        expression: `u = ${vectorText(u)}; v = ${vectorText(v)}; w = ${vectorText(vecW)}`,
        explanation: "Tres vectores de ℝ³ para verificar la bilinealidad de la operación.",
      },
      {
        title: "Suma de vectores v + w",
        expression: `v + w = ${vectorText(vPlusW)}`,
        explanation: "Suma componente a componente en ℝ³.",
      },
      {
        title: "Lado izquierdo u × (v + w)",
        expression: `u × (v + w) = ${vectorText(uCrossVPlusW)}`,
        explanation: "Producto vectorial entre u y el vector suma v + w.",
      },
      {
        title: "Lado derecho (u × v) + (u × w)",
        expression: `(${vectorText(uCrossV)}) + (${vectorText(uCrossW)}) = ${vectorText(sumCrosses)}`,
        explanation: "Suma de los dos productos cruz individuales.",
      },
      {
        title: "Comprobación de identidad",
        expression: `u × (v + w) − ((u × v) + (u × w)) = ${vectorText(distDiff)}`,
        explanation: distRes <= 1e-11
          ? "Identidad distributiva confirmada exactamente: la diferencia es el vector nulo."
          : "Discrepancia en la expansión distributiva.",
      },
    ],
    scalarDotWarning: "El producto cruz distribuye sobre la suma vectorial: u × (v + w) = u × v + u × w (suma de vectores). El producto escalar también distribuye: u · (v + w) = u · v + u · w, pero suma números escalares.",
  };

  const identities = [antiProof, selfProof, scalarProof, distProof];
  const proofs = identities;
  const allPassed = identities.every(i => i.isExactMatch);
  const summary = allPassed
    ? "Todas las identidades fundamentales del producto cruz han sido verificadas analíticamente con error numérico nulo."
    : "Se encontraron discrepancias en una o más identidades algebraicas.";
  const scalarWarning = "No confundir con el producto escalar: u · v es un escalar conmutativo en ℝ (u · v = v · u), mientras que u × v es un vector anticonmutativo en ℝ³ (u × v = -(v × u)).";

  return {
    identities,
    proofs,
    allPassed,
    summary,
    scalarWarning,
  };
}

export type CrossProductScene =
  | {
      normal: Vector3;
      area: number;
      triangleArea: number;
      origin?: Vector3;
      opposite: Vector3 | null;
      error?: never;
      warning?: string;
      anticommutative?: AnticommutativityInfo;
      distributive?: DistributivityInfo;
    }
  | {
      error: string;
      normal?: never;
      area?: never;
      triangleArea?: never;
      origin?: never;
      opposite?: never;
      warning?: never;
      anticommutative?: never;
      distributive?: never;
    };

/** Test for exact dependence when floating-point products cancel, underflow, or overflow. */
function areExactlyDependent(u: Vector3, v: Vector3): boolean {
  const view = new DataView(new ArrayBuffer(8));
  const significandBit = 1n << 52n;
  const parts = (value: number) => {
    view.setFloat64(0, value);
    const bits = view.getBigUint64(0);
    const storedExponent = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & (significandBit - 1n);
    const significand = storedExponent ? fraction | significandBit : fraction;
    return {
      integer: bits >> 63n ? -significand : significand,
      exponent: (storedExponent || 1) - 1075,
    };
  };
  const left = u.map(parts);
  const right = v.map(parts);
  return ([0, 1, 2] as const).every(i => {
    const j = (i + 1) % 3;
    const exponentA = left[i].exponent + right[j].exponent;
    const exponentB = left[j].exponent + right[i].exponent;
    const common = Math.min(exponentA, exponentB);
    const a = left[i].integer * right[j].integer << BigInt(exponentA - common);
    const b = left[j].integer * right[i].integer << BigInt(exponentB - common);
    return a === b;
  });
}

const cofactorAxes = [
  { axis: "i", columns: [1, 2], sign: 1 },
  { axis: "j", columns: [0, 2], sign: -1 },
  { axis: "k", columns: [0, 1], sign: 1 },
] as const;
const cyclicAxes = cofactorAxes.map(({ columns, sign }) => sign === 1 ? columns : [columns[1], columns[0]] as const);

function integerProductTerms(a: Vector3, b: Vector3) {
  if (!a.every(Number.isSafeInteger) || !b.every(Number.isSafeInteger)) return undefined;
  const first = a.map(BigInt);
  const second = b.map(BigInt);
  return cyclicAxes.map(([i, j]) => [first[i] * second[j], first[j] * second[i]] as const);
}

function integerSquareRoot(value: bigint): bigint {
  if (value < 2n) return value;
  let root = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  let next = (root + value / root) / 2n;
  while (next < root) {
    root = next;
    next = (root + value / root) / 2n;
  }
  return root;
}

function describeExactCrossProductArea(
  u: Vector3,
  v: Vector3,
  origin: Vector3 = [0, 0, 0],
): CrossProductAreaInfo["exact"] {
  const terms = integerProductTerms(u, v);
  if (!terms) return undefined;
  const normal = terms.map(([positive, negative]) => positive - negative);
  const squaredArea = normal.reduce((sum, component) => sum + component * component, 0n);
  const root = integerSquareRoot(squaredArea);
  const isPerfectSquare = root * root === squaredArea;
  const radicand = String(squaredArea);
  const parallelogram = isPerfectSquare ? String(root) : `√${radicand}`;
  const triangle = isPerfectSquare && root % 2n === 0n ? String(root / 2n) : `${parallelogram}/2`;
  const squares = normal.map(component => component < 0n ? `(${component})²` : `${component}²`);
  return {
    radicand,
    parallelogram,
    triangle,
    substitution: `n = (${normal.join(", ")}). N = nₓ² + nᵧ² + n_z² = ${squares.join(" + ")} = ${radicand}.`,
    check: `A_paralelogramo² = (2 · A_triángulo)² = ${radicand}.`,
    translation: `Con P₀ = (${origin.join(", ")}), los desplazamientos se recuperan como (P₀ + u) − P₀ = u y (P₀ + v) − P₀ = v. El producto cruz y ambas áreas se conservan.`,
  };
}

/** Builds the oriented parallelogram and its unnormalized normal in ℝ³. */
export function computeCrossProductScene(
  u: Vector3,
  v: Vector3,
  reverseOrder = false,
  w?: Vector3,
  origin?: Vector3,
): CrossProductScene {
  const rangeError = "Las coordenadas o el área exceden la precisión numérica de la escena.";
  if (!isFiniteVector(u, 3) || !isFiniteVector(v, 3)) return { error: rangeError };
  const orig: Vector3 | undefined = origin && isFiniteVector(origin, 3) ? origin : undefined;
  const distributive = w && isFiniteVector(w, 3) ? computeCrossProductDistributivity(u, v, w) : undefined;
  const [a, b] = reverseOrder ? [v, u] : [u, v];
  const terms = integerProductTerms(a, b);
  const normal = terms
    ? terms.map(([positive, negative]) => Number(positive - negative)) as Vector3
    : crossProduct(a, b);
  const area = Math.hypot(...normal);
  const triangleArea = area / 2;
  if (!Number.isFinite(area) || area === 0) {
    const op = reverseOrder ? "v × u" : "u × v";
    return areExactlyDependent(u, v)
      ? {
          normal: [0, 0, 0],
          area: 0,
          triangleArea: 0,
          opposite: null,
          warning: `Los vectores son paralelos o nulos (${op} = 0): no hay normal única por esos vectores`,
          ...(orig ? { origin: orig } : {}),
          ...(distributive ? { distributive } : {}),
        }
      : { error: rangeError };
  }
  const opposite: Vector3 = [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
  return isFiniteVector(opposite, 3)
    ? {
        normal,
        area,
        triangleArea,
        opposite,
        ...(orig ? { origin: orig } : {}),
        ...(distributive ? { distributive } : {}),
      }
    : { error: rangeError };
}

/**
 * Verifica si dos vectores son paralelos con tolerancia.
 */
export function isParallel(a: Vector3, b: Vector3, tol = 1e-12): boolean {
  const magA = Math.hypot(...a);
  const magB = Math.hypot(...b);
  if (magA < tol || magB < tol) return true;
  return crossMagnitude(a, b) / (magA * magB) < tol;
}

/**
 * Producto triple escalar u·(v×w)
 */
export function tripleProduct(u: Vector3, v: Vector3, w: Vector3): number {
  const c = crossProduct(v, w);
  return u[0] * c[0] + u[1] * c[1] + u[2] * c[2];
}

/**
 * Comprueba analíticamente la perpendicularidad de la normal respecto a u y v mediante producto escalar.
 * Devuelve los productos escalares u · n y v · n, garantizando u · n = 0 y v · n = 0 si n es perpendicular.
 */
export interface PerpendicularityInfo {
  dotU: number;
  dotV: number;
  dotUExpr: string;
  dotVExpr: string;
  isPerpendicular: boolean;
  isCollinear: boolean;
  explanation: string;
}

/**
 * Comprueba analíticamente la perpendicularidad de la normal respecto a u y v mediante producto escalar.
 * Devuelve los productos escalares u · n y v · n, con desglose de la suma componente a componente.
 */
export function verifyPerpendicularity(u: Vector3, v: Vector3, normal?: Vector3): PerpendicularityInfo {
  const isNormalZero = !normal || normal.every(c => c === 0);
  const isCollinear = areExactlyDependent(u, v) || isNormalZero;
  if (isNormalZero || !normal) {
    return {
      dotU: 0,
      dotV: 0,
      dotUExpr: `${formatComponent(u[0])}·0 + ${formatComponent(u[1])}·0 + ${formatComponent(u[2])}·0 = 0`,
      dotVExpr: `${formatComponent(v[0])}·0 + ${formatComponent(v[1])}·0 + ${formatComponent(v[2])}·0 = 0`,
      isPerpendicular: false,
      isCollinear: true,
      explanation: "El vector normal es nulo (u × v = 0): los vectores son paralelos, colineales o nulos, y no determinan una normal única por esos vectores.",
    };
  }

  const exact = u.every(Number.isSafeInteger) && v.every(Number.isSafeInteger) && normal.every(Number.isSafeInteger);
  let dotUVal: number;
  let dotVVal: number;
  let dotUExpr: string;
  let dotVExpr: string;

  if (exact) {
    const [ux, uy, uz] = u.map(BigInt);
    const [vx, vy, vz] = v.map(BigInt);
    const [nx, ny, nz] = normal.map(BigInt);
    const dotUBig = ux * nx + uy * ny + uz * nz;
    const dotVBig = vx * nx + vy * ny + vz * nz;
    dotUVal = Number(dotUBig);
    dotVVal = Number(dotVBig);
    dotUExpr = `${ux}·(${nx}) + ${uy}·(${ny}) + ${uz}·(${nz}) = ${dotUBig}`;
    dotVExpr = `${vx}·(${nx}) + ${vy}·(${ny}) + ${vz}·(${nz}) = ${dotVBig}`;
  } else {
    const prodU = u.map((c, i) => c * normal[i]);
    const prodV = v.map((c, i) => c * normal[i]);
    dotUVal = prodU.reduce((a, b) => a + b, 0);
    dotVVal = prodV.reduce((a, b) => a + b, 0);
    if (Math.abs(dotUVal) <= 1e-11) dotUVal = 0;
    if (Math.abs(dotVVal) <= 1e-11) dotVVal = 0;
    dotUExpr = `${formatFactor(u[0])}·${formatFactor(normal[0])} + ${formatFactor(u[1])}·${formatFactor(normal[1])} + ${formatFactor(u[2])}·${formatFactor(normal[2])} = ${dotUVal}`;
    dotVExpr = `${formatFactor(v[0])}·${formatFactor(normal[0])} + ${formatFactor(v[1])}·${formatFactor(normal[1])} + ${formatFactor(v[2])}·${formatFactor(normal[2])} = ${dotVVal}`;
  }

  const isPerpendicular = dotUVal === 0 && dotVVal === 0;
  return {
    dotU: dotUVal,
    dotV: dotVVal,
    dotUExpr,
    dotVExpr,
    isPerpendicular,
    isCollinear,
    explanation: isPerpendicular
      ? `La normal es perpendicular al plano generado por u y v: u · n = 0 y v · n = 0.`
      : `La normal no es perpendicular: u · n = ${dotUVal}, v · n = ${dotVVal}.`,
  };
}

/**
 * Volumen del paralelepípedo = |u·(v×w)|
 */
export function parallelepipedVolume(u: Vector3, v: Vector3, w: Vector3): number {
  return Math.abs(tripleProduct(u, v, w));
}

/**
 * Información sobre el volumen del paralelepípedo generado por tres vectores.
 * Incluye el volumen firmado, el valor absoluto y la orientación.
 */
export interface ParallelepipedVolumeInfo {
  volumeSigned: number;
  volumeAbsolute: number;
  orientation: "positive" | "negative" | "degenerate";
  formula: string;
  explanation: string;
}

/**
 * Calcula el volumen del paralelepípedo generado por tres vectores u, v, w.
 * El volumen firmado se obtiene del producto triple escalar u·(v×w).
 * Un valor negativo indica orientación opuesta según la regla de la mano derecha.
 * Un valor cero indica que los vectores son coplanares o nulos.
 */
export function computeParallelepipedVolume(u: Vector3, v: Vector3, w: Vector3): ParallelepipedVolumeInfo {
  const signedVolume = tripleProduct(u, v, w);
  const absoluteVolume = Math.abs(signedVolume);
  const magU = Math.hypot(...u);
  const magV = Math.hypot(...v);
  const magW = Math.hypot(...w);

  const isZero = absoluteVolume < 1e-14;

  if (isZero) {
    return {
      volumeSigned: 0,
      volumeAbsolute: 0,
      orientation: "degenerate",
      formula: "|u·(v×w)| = 0 (vectores coplanares o nulos)",
      explanation: "El producto triple escalar es cero: los tres vectores son coplanares o al menos uno es nulo. El paralelepípedo colapsa a un plano o línea.",
    };
  }

  const uCrossW = crossProduct(u, w);
  const crossMag = crossMagnitude(u, w);
  const sinTheta = crossMag / (magU * magW);
  const cosPhi = signedVolume / (crossMag * magV);
  const phi = Math.acos(Math.max(-1, Math.min(1, Math.abs(cosPhi))));

  const orientation = signedVolume > 0 ? "positive" : "negative";

  return {
    volumeSigned: signedVolume,
    volumeAbsolute: absoluteVolume,
    orientation,
    formula: `V = u·(v×w) = ${signedVolume.toFixed(6)} (volumen firmado) = |V| = ${absoluteVolume.toFixed(6)} (volumen geométrico)`,
    explanation: orientation === "positive"
      ? `Volumen firmado positivo: los vectores u, v, w forman un triedro dextrógira (mano derecha). V = ${signedVolume.toFixed(6)}`
      : `Volumen firmado negativo: los vectores u, v, w forman un triedro latrongira. V = ${signedVolume.toFixed(6)} (el volumen geométrico es |V| = ${absoluteVolume.toFixed(6)})`,
  };
}

/**
 * Normal no normalizada a dos vectores.
 * Devuelve null si son paralelos o nulos.
 */
export function normalToPlaneFromVectors(a: Vector3, b: Vector3): Vector3 | null {
  const c = crossProduct(a, b);
  const mag = crossMagnitude(a, b);
  if (mag < 1e-12) return null;
  return c;
}

/**
 * Información sobre la prueba de coplanaridad de tres vectores.
 * Usa aritmética exacta (BigInt) cuando las componentes son enteras seguras.
 */
export interface CoplanarityTest {
  u: Vector3;
  v: Vector3;
  w: Vector3;
  isCoplanar: boolean;
  tripleProduct: number;
  tripleProductExact: boolean;
  exactValue?: string;
  explanation: string;
  steps: Array<{
    title: string;
    expression: string;
    explanation: string;
  }>;
}

/**
 * Prueba exacta de coplanaridad de tres vectores.
 * Tres vectores u, v, w son coplanares si y solo si u·(v×w) = 0.
 * Usa aritmética exacta (BigInt) cuando las componentes son enteras seguras
 * para evitar falsos positivos por redondeo de punto flotante.
 */
export function testCoplanarity(u: Vector3, v: Vector3, w: Vector3): CoplanarityTest {
  const exact = u.every(Number.isSafeInteger) && v.every(Number.isSafeInteger) && w.every(Number.isSafeInteger);
  
  // v × w
  const vCrossW = crossProduct(v, w);
  // u · (v × w)
  const triple = tripleProduct(u, v, w);
  
  // Para exact, recalculamos con BigInt
  let tripleExact: bigint | null = null;
  let isCoplanar = false;
  
  if (exact) {
    const [ux, uy, uz] = u.map(BigInt);
    const [vx, vy, vz] = v.map(BigInt);
    const [wx, wy, wz] = w.map(BigInt);
    // v × w con BigInt
    const vCrossWBigInt: [bigint, bigint, bigint] = [
      vy * wz - vz * wy,
      vz * wx - vx * wz,
      vx * wy - vy * wx,
    ];
    tripleExact = ux * vCrossWBigInt[0] + uy * vCrossWBigInt[1] + uz * vCrossWBigInt[2];
    isCoplanar = tripleExact === 0n;
  } else {
    isCoplanar = Math.abs(triple) < 1e-12;
  }
  
  const steps: Array<{ title: string; expression: string; explanation: string }> = [
    {
      title: "Datos y condiciones",
      expression: `u = (${u.join(", ")}); v = (${v.join(", ")}); w = (${w.join(", ")})`,
      explanation: "Tres vectores en ℝ³. Son coplanares si y solo si su producto triple escalar es cero."
    },
    {
      title: "Paso 1: Calcular v × w",
      expression: `v × w = (${vCrossW.join(", ")})`,
      explanation: "Producto vectorial de v y w. Resulta en un vector perpendicular al plano generado por v y w."
    },
    {
      title: "Paso 2: Calcular u · (v × w)",
      expression: exact
        ? `u · (v × w) = ${triple.toString()}`
        : `u · (v × w) ≈ ${triple.toFixed(6)}`,
      explanation: "Producto escalar de u con el vector perpendicular. Si es cero, u está en el plano de v y w (coplanares)."
    },
    {
      title: "Paso 3: Verificar coplanaridad",
      expression: isCoplanar ? "u · (v × w) = 0" : `u · (v × w) ≠ 0 (valor: ${exact ? triple.toString() : triple.toFixed(6)})`,
      explanation: isCoplanar
        ? "El producto triple escalar es exactamente cero. Los tres vectores son coplanares: el paralelepípedo colapsa a un plano (volumen = 0)."
        : "El producto triple escalar no es cero. Los tres vectores no son coplanares: forman un paralelepípedo con volumen no nulo."
    }
  ];

  return {
    u,
    v,
    w,
    isCoplanar,
    tripleProduct: exact && tripleExact !== null ? Number(tripleExact) : triple,
    tripleProductExact: exact,
    exactValue: exact && tripleExact !== null ? tripleExact.toString() : undefined,
    explanation: isCoplanar
      ? `Los vectores son coplanares (u·(v×w) = 0). El paralelepípedo tiene volumen nulo.`
      : `Los vectores NO son coplanares (u·(v×w) = ${exact && tripleExact !== null ? tripleExact.toString() : triple.toFixed(6)} ≠ 0). El paralelepípedo tiene volumen |${exact && tripleExact !== null ? Math.abs(Number(tripleExact)) : Math.abs(triple).toFixed(6)}|.`,
    steps,
  };
}

/**
 * Información sobre el estudio del producto triple escalar u·(v×w).
 * Incluye el cálculo paso a paso, permutaciones cíclicas y propiedades.
 */
export interface TripleProductStudy {
  u: Vector3;
  v: Vector3;
  w: Vector3;
  volumeSigned: number;
  volumeAbsolute: number;
  orientation: "positive" | "negative" | "degenerate";
  vCrossW: Vector3;
  tripleProductFormula: string;
  cyclicPermutations: Array<{
    permutation: string;
    formula: string;
    result: number;
    isEqual: boolean;
  }>;
  antiCyclicPermutations: Array<{
    permutation: string;
    formula: string;
    result: number;
    signFlipped: boolean;
  }>;
  determinant: number;
  exact: boolean;
  explanation: string;
}

/**
 * Calcula el producto triple escalar u·(v×w) con desglose pedagógico completo.
 * Incluye: v×w, u·(v×w), permutaciones cíclicas (preservan el valor),
 * permutaciones antíclicas (cambian el signo), determinante y orientación.
 */
export function computeTripleProductStudy(
  u: Vector3,
  v: Vector3,
  w: Vector3
): TripleProductStudy {
  // v × w
  const vCrossW = crossProduct(v, w);
  // u · (v × w)
  const signedVolume = tripleProduct(u, v, w);
  const absoluteVolume = Math.abs(signedVolume);
  const magU = Math.hypot(...u);
  const magV = Math.hypot(...v);
  const magW = Math.hypot(...w);

  const isZero = absoluteVolume < 1e-14;
  const exact = u.every(Number.isSafeInteger) && v.every(Number.isSafeInteger) && w.every(Number.isSafeInteger);

  if (isZero) {
    return {
      u, v, w,
      volumeSigned: 0,
      volumeAbsolute: 0,
      orientation: "degenerate",
      vCrossW: [0, 0, 0],
      tripleProductFormula: "u·(v×w) = 0 (vectores coplanares o nulos)",
      cyclicPermutations: [
        { permutation: "u·(v×w)", formula: "u·(v×w)", result: 0, isEqual: true },
        { permutation: "v·(w×u)", formula: "v·(w×u)", result: 0, isEqual: true },
        { permutation: "w·(u×v)", formula: "w·(u×v)", result: 0, isEqual: true },
      ],
      antiCyclicPermutations: [
        { permutation: "u·(w×v)", formula: "u·(w×v) = −u·(v×w)", result: 0, signFlipped: true },
        { permutation: "v·(u×w)", formula: "v·(u×w) = −v·(w×u)", result: 0, signFlipped: true },
        { permutation: "w·(v×u)", formula: "w·(v×u) = −w·(u×v)", result: 0, signFlipped: true },
      ],
      determinant: 0,
      exact: true,
      explanation: "El producto triple escalar es cero: los tres vectores son coplanares o al menos uno es nulo. El paralelepípedo colapsa a un plano o línea. Todas las permutaciones dan 0.",
    };
  }

  // Permutaciones cíclicas: u·(v×w) = v·(w×u) = w·(u×v)
  const wCrossU = crossProduct(w, u);
  const uCrossV = crossProduct(u, v);
  const cyclic1 = tripleProduct(v, w, u);
  const cyclic2 = tripleProduct(w, u, v);

  // Permutaciones antíclicas (intercambio de dos vectores): cambian el signo
  const wCrossV = crossProduct(w, v);
  const uCrossW = crossProduct(u, w);
  const vCrossU = crossProduct(v, u);
  const anti1 = tripleProduct(u, w, v);
  const anti2 = tripleProduct(v, u, w);
  const anti3 = tripleProduct(w, v, u);

  const determinant = signedVolume; // El determinante de la matriz [u;v;w]
  const orientation = signedVolume > 0 ? "positive" : "negative";

  return {
    u, v, w,
    volumeSigned: signedVolume,
    volumeAbsolute: absoluteVolume,
    orientation,
    vCrossW,
    tripleProductFormula: exact
      ? `u·(v×w) = ${signedVolume}`
      : `u·(v×w) ≈ ${signedVolume.toFixed(6)}`,
    cyclicPermutations: [
      { permutation: "u·(v×w)", formula: `u·(v×w)`, result: signedVolume, isEqual: true },
      { permutation: "v·(w×u)", formula: `v·(w×u)`, result: cyclic1, isEqual: Math.abs(cyclic1 - signedVolume) <= 1e-11 },
      { permutation: "w·(u×v)", formula: `w·(u×v)`, result: cyclic2, isEqual: Math.abs(cyclic2 - signedVolume) <= 1e-11 },
    ],
    antiCyclicPermutations: [
      { permutation: "u·(w×v)", formula: `u·(w×v) = −u·(v×w)`, result: anti1, signFlipped: Math.abs(anti1 + signedVolume) <= 1e-11 },
      { permutation: "v·(u×w)", formula: `v·(u×w) = −v·(w×u)`, result: anti2, signFlipped: Math.abs(anti2 + cyclic1) <= 1e-11 },
      { permutation: "w·(v×u)", formula: `w·(v×u) = −w·(u×v)`, result: anti3, signFlipped: Math.abs(anti3 + cyclic2) <= 1e-11 },
    ],
    determinant,
    exact,
    explanation: orientation === "positive"
      ? `Volumen firmado positivo (${signedVolume.toFixed(exact ? 0 : 6)}): los vectores u, v, w forman un triedro dextrógira (mano derecha). El volumen geométrico es |V| = ${absoluteVolume.toFixed(exact ? 0 : 6)}. Las permutaciones cíclicas preservan el valor; intercambiar dos vectores cambia el signo.`
      : `Volumen firmado negativo (${signedVolume.toFixed(exact ? 0 : 6)}): los vectores u, v, w forman un triedro latrógira. El volumen geométrico es |V| = ${absoluteVolume.toFixed(exact ? 0 : 6)}. Las permutaciones cíclicas preservan el valor; intercambiar dos vectores cambia el signo.`,
  };
}

/**
 * Componentes del producto cruz con pasos pedagógicos.
 */
export interface CrossStep {
  title: string;
  expression: string;
  explanation: string;
  cofactors?: CrossProductCofactor[];
  orientation?: CrossProductOrientation;
  area?: CrossProductAreaInfo;
  perpendicularity?: PerpendicularityInfo;
  anticommutative?: AnticommutativityInfo;
  distributive?: DistributivityInfo;
  identities?: CrossProductIdentityReport;
}

export interface CrossProductCofactor {
  axis: "i" | "j" | "k";
  columns: [number, number];
  sign: 1 | -1;
  rows: [[number, number], [number, number]];
  substitution: string;
  difference?: string;
  minor: string;
  minorRelation: "=" | "≈";
  coefficient: string;
  coefficientRelation: "=" | "≈";
}

export interface CrossProductOrientation {
  order: "u × v" | "v × u";
  reversed: boolean;
  normal: Vector3;
  oppositeNormal: Vector3;
  oppositeOrder: "u × v" | "v × u";
  anticommutativeIdentity: string;
  anticommutativeValues: string;
  isDegenerate: boolean;
  handedness: string;
  tripleProductDeterminant: number;
  curlDescription: string;
  thumbDescription: string;
}

export interface CrossProductStudy {
  scene: CrossProductScene;
  operation: string;
  resultText: string;
  steps: CrossStep[];
  orientation: CrossProductOrientation;
  area: CrossProductAreaInfo;
  perpendicularity: PerpendicularityInfo;
  anticommutative?: AnticommutativityInfo;
  distributive?: DistributivityInfo;
  identities?: CrossProductIdentityReport;
}

interface CrossProductOperand {
  name: "u" | "v";
  vector: Vector3;
}

function orderedCrossProductOperands(u: Vector3, v: Vector3, reverseOrder: boolean): [CrossProductOperand, CrossProductOperand] {
  const first: CrossProductOperand = { name: "u", vector: u };
  const second: CrossProductOperand = { name: "v", vector: v };
  return reverseOrder ? [second, first] : [first, second];
}

export interface CrossProductDeterminant {
  operation: string;
  rows: [CrossProductOperand, CrossProductOperand];
  scene: CrossProductScene;
}

/** Associates the ordered determinant rows with the normal already used by the scene. */
export function describeCrossProductDeterminant(
  u: Vector3, v: Vector3, scene: CrossProductScene, reverseOrder = false,
): CrossProductDeterminant {
  const rows = orderedCrossProductOperands(u, v, reverseOrder);
  return { rows, operation: `${rows[0].name} × ${rows[1].name}`, scene };
}

function formatComponent(value: number): string {
  return Number.isFinite(value) ? String(value) : "fuera de rango";
}

function formatFactor(value: number): string {
  return value < 0 ? "(" + value + ")" : String(value);
}

function expandCrossProductCofactors(
  a: Vector3, b: Vector3, normal: Vector3, integerTerms: ReturnType<typeof integerProductTerms>,
): CrossProductCofactor[] {
  const degenerate = normal.every(component => component === 0);
  return cofactorAxes.map(({ axis, columns: [i, j], sign }, index) => {
    const [left, right] = integerTerms
      ? (sign === 1 ? integerTerms[index] : [integerTerms[index][1], integerTerms[index][0]])
      : [a[i] * b[j], a[j] * b[i]];
    const finiteProducts = integerTerms !== undefined || (Number.isFinite(left) && Number.isFinite(right));
    const minor = typeof left === "bigint" && typeof right === "bigint"
      ? String(left - right) : formatComponent(sign * normal[index]);
    const rawSub = `${formatFactor(a[i])} · ${formatFactor(b[j])} − ${formatFactor(a[j])} · ${formatFactor(b[i])}`;
    const substitution = sign === -1 ? `−(${rawSub})` : rawSub;
    const rawDiff = finiteProducts ? `${left} − (${right})` : undefined;
    const difference = rawDiff ? (sign === -1 ? `−(${rawDiff})` : rawDiff) : undefined;
    return {
      axis, columns: [i + 1, j + 1], sign, rows: [[a[i], a[j]], [b[i], b[j]]],
      substitution,
      difference,
      minor,
      minorRelation: integerTerms || degenerate ? "=" : "≈",
      coefficient: formatComponent(normal[index]),
      coefficientRelation: degenerate || (integerTerms && Number.isSafeInteger(normal[index])) ? "=" : "≈",
    };
  });
}

function unitVector(vector: Vector3): Vector3 {
  const scale = Math.max(...vector.map(Math.abs));
  const scaled = vector.map(component => component / scale);
  const length = Math.hypot(...scaled);
  return scaled.map(component => component / length) as Vector3;
}

function checkCrossProduct(u: Vector3, v: Vector3, normal: Vector3, exact: boolean): CrossStep {
  const title = "Comprobación";
  const perpInfo = verifyPerpendicularity(u, v, normal);
  if (normal.every(component => component === 0)) {
    return {
      title,
      expression: "u · n = 0; v · n = 0; det(u, v, n) = 0",
      explanation: "Con n = 0, ambos productos escalares y el determinante son nulos sin normalizar. Si u × v = 0, no hay normal única por esos vectores (vectores paralelos o nulos).",
      perpendicularity: perpInfo,
    };
  }
  if (exact) {
    const dot = (vector: Vector3) => vector.reduce((sum, component, i) => sum + BigInt(component) * BigInt(normal[i]), 0n);
    const [ux, uy, uz] = u.map(BigInt);
    const [vx, vy, vz] = v.map(BigInt);
    const [nx, ny, nz] = normal.map(BigInt);
    const determinant = ux * (vy * nz - vz * ny) + uy * (vz * nx - vx * nz) + uz * (vx * ny - vy * nx);
    return {
      title,
      expression: `u · n = ${dot(u)}; v · n = ${dot(v)}; det(u, v, n) = ${determinant}`,
      explanation: "Los productos escalares comprueban la perpendicularidad. El signo del determinante verifica la orientación respecto al orden fijo u, v.",
      perpendicularity: perpInfo,
    };
  }
  const direction = unitVector(normal);
  const dot = (vector: Vector3) => unitVector(vector).reduce((sum, component, i) => sum + component * direction[i], 0);
  const residuals = [dot(u), dot(v)];
  const tolerance = 1e-12;
  return {
    title,
    expression: `û · n̂ ≈ ${residuals[0].toExponential(3)}; v̂ · n̂ ≈ ${residuals[1].toExponential(3)}`,
    explanation: residuals.every(residual => Math.abs(residual) <= tolerance)
      ? "La comprobación numérica de perpendicularidad usa direcciones unitarias y tolerancia 1e−12."
      : "El residuo supera 1e−12. La precisión de coma flotante es insuficiente para verificar la perpendicularidad.",
    perpendicularity: perpInfo,
  };
}

/**
 * Análisis puramente algebraico de la orientación y la regla de la mano derecha en ℝ³.
 * Relaciona orden de factores, sentido de giro, triedro dextrógiro y propiedad anticonmutativa.
 */
export function computeCrossProductOrientation(
  u: Vector3,
  v: Vector3,
  reverseOrder = false,
): CrossProductOrientation {
  const [{ name: first, vector: a }, { name: second, vector: b }] = orderedCrossProductOperands(u, v, reverseOrder);
  const order: "u × v" | "v × u" = reverseOrder ? "v × u" : "u × v";
  const oppositeOrder: "u × v" | "v × u" = reverseOrder ? "u × v" : "v × u";

  const scene = computeCrossProductScene(u, v, reverseOrder);
  const normal: Vector3 = scene.normal ?? [0, 0, 0];
  const oppositeNormal: Vector3 = [
    normal[0] === 0 ? 0 : -normal[0],
    normal[1] === 0 ? 0 : -normal[1],
    normal[2] === 0 ? 0 : -normal[2],
  ];
  const isDegenerate = normal.every(component => component === 0);

  const vectorText = (vector: Vector3) => "(" + vector.map(formatComponent).join(", ") + ")";

  if (isDegenerate) {
    return {
      order,
      reversed: reverseOrder,
      normal,
      oppositeNormal,
      oppositeOrder,
      anticommutativeIdentity: `${oppositeOrder} = −(${order}) = (0, 0, 0)`,
      anticommutativeValues: "(0, 0, 0) = −(0, 0, 0)",
      isDegenerate: true,
      handedness: "degenerada (vectores colineales o nulos, orientación indefinida)",
      tripleProductDeterminant: 0,
      curlDescription: "Sin giro angular definido en el plano (vectores linealmente dependientes)",
      thumbDescription: "Vector normal nulo (0, 0, 0), sin dirección de pulgar",
    };
  }

  const integerTerms = integerProductTerms(a, b);
  const exactTripleDet = integerTerms !== undefined && normal.every(Number.isSafeInteger)
    ? Number(normal.reduce((sum, comp) => sum + BigInt(comp) * BigInt(comp), 0n))
    : normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2];

  const anticommutativeIdentity = `${oppositeOrder} = −(${order})`;
  const anticommutativeValues = `${vectorText(oppositeNormal)} = −${vectorText(normal)}`;

  return {
    order,
    reversed: reverseOrder,
    normal,
    oppositeNormal,
    oppositeOrder,
    anticommutativeIdentity,
    anticommutativeValues,
    isDegenerate: false,
    handedness: "dextrógira (triedro derecho orientado positivamente)",
    tripleProductDeterminant: exactTripleDet,
    curlDescription: `Giro desde ${first} hacia ${second} cerrando los dedos de la mano derecha sobre el plano`,
    thumbDescription: `Pulgar extendido apuntando en dirección de la normal resultante n = ${vectorText(normal)}`,
  };
}

/** Calculates the same normal displayed by the scene and explains each arithmetic step. */
export function computeCrossProductStudy(
  u: Vector3,
  v: Vector3,
  reverseOrder = false,
  showCofactors = false,
  w?: Vector3,
  showIdentities = false,
  origin?: Vector3,
): CrossProductStudy {
  const [{ name: first, vector: a }, { name: second, vector: b }] = orderedCrossProductOperands(u, v, reverseOrder);
  const operation = `${first} × ${second}`;
  const scene = computeCrossProductScene(u, v, reverseOrder, w, origin);
  const orientation = computeCrossProductOrientation(u, v, reverseOrder);
  const areaInfo = computeCrossProductArea(a, b, origin, scene);
  const anticommutative = computeCrossProductAnticommutativity(u, v, reverseOrder);
  const distributive = w && isFiniteVector(w, 3) ? computeCrossProductDistributivity(u, v, w) : undefined;
  const identities = showIdentities ? inspectCrossProductIdentities(u, v, w) : undefined;
  const vectorText = (vector: Vector3) => "(" + vector.map(formatComponent).join(", ") + ")";
  const steps: CrossStep[] = [{
    title: "Datos y condiciones",
    expression: `${first} = ${vectorText(a)}; ${second} = ${vectorText(b)}`,
    explanation: "El producto cruz recibe dos vectores de ℝ³ con componentes finitas.",
  }];
  if (scene.error !== undefined) {
    steps.push({ title: "Diagnóstico", expression: "Resultado fuera de rango", explanation: scene.error });
    const fallbackPerp: PerpendicularityInfo = {
      dotU: 0, dotV: 0, dotUExpr: "indeterminado", dotVExpr: "indeterminado",
      isPerpendicular: false, isCollinear: false, explanation: scene.error,
    };
    const fallbackAnti: AnticommutativityInfo = {
      directOperation: operation,
      reverseOperation: reverseOrder ? "u × v" : "v × u",
      directNormal: [0, 0, 0],
      oppositeNormal: [0, 0, 0],
      isNegationExact: false,
      isZero: true,
      identityLatex: "",
      explanation: scene.error,
    };
    return { scene, operation, resultText: "indeterminado", steps, orientation, area: areaInfo, perpendicularity: fallbackPerp, anticommutative: fallbackAnti, ...(identities ? { identities } : {}) };
  }

  const perpInfo = verifyPerpendicularity(a, b, scene.normal);

  const integerTerms = integerProductTerms(a, b);
  const exact = integerTerms !== undefined && scene.normal.every(Number.isSafeInteger);
  const resultText = (exact ? "= " : "≈ ") + vectorText(scene.normal);
  const substitute = cyclicAxes.map(([i, j]) =>
    `${formatFactor(a[i])} · ${formatFactor(b[j])} − ${formatFactor(a[j])} · ${formatFactor(b[i])}`);
  const simplify = integerTerms?.map(([left, right]) => `${left} − (${right})`);
  steps.push(
    {
      title: "Fórmula y justificación",
      expression: "a × b = (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁)",
      explanation: `Cada componente es un determinante de 2 × 2. Aquí a = ${first} y b = ${second}.`,
    },
    { title: "Sustitución", expression: "(" + substitute.join(", ") + ")", explanation: "Se sustituyen las componentes sin cambiar el orden de los factores." },
    {
      title: "Simplificación",
      expression: simplify ? "(" + simplify.join(", ") + ")" : resultText,
      explanation: simplify ? "Se evalúan los dos productos de cada componente y se resta el segundo del primero."
        : "Se evalúan los productos y las restas en coma flotante.",
      ...(showCofactors ? { cofactors: expandCrossProductCofactors(a, b, scene.normal, integerTerms) } : {}),
    },
    {
      title: "Resultado",
      expression: `${operation} ${resultText}`,
      explanation: exact ? "Las componentes enteras del resultado son exactas." : "El resultado se muestra con la precisión de coma flotante.",
    },
    {
      title: "Módulo y área del paralelogramo",
      expression: `${areaInfo.formula}; ${areaInfo.triangleFormula}`,
      explanation: areaInfo.isZero
        ? "Al menos uno de los vectores es nulo: no define dirección ni ángulo θ, y tanto el área del paralelogramo como la del triángulo son 0 sin división por cero."
        : areaInfo.isParallel
        ? "Los vectores son paralelos o colineales (θ = 0° o 180°), por lo que sen(θ) = 0 y el área del paralelogramo y del triángulo se anula limpiamente."
        : `La magnitud del producto cruz ‖${operation}‖ ≈ ${formatAreaNumber(areaInfo.area, 4)} coincide con el área del paralelogramo sustentado por ${first} y ${second}, evaluada como ‖${first}‖ · ‖${second}‖ · sen(θ) con θ ≈ ${areaInfo.thetaDeg.toFixed(2)}°. El triángulo sustentado por ambos vectores tiene exactamente la mitad de dicha área: Área(triángulo) = 1/2 · ‖${operation}‖ ≈ ${formatAreaNumber(areaInfo.triangleArea, 4)}. Esta relación geométrica es invariante ante traslaciones de los vértices.`,
      area: areaInfo,
    },
    {
      title: "Interpretación",
      expression: `${orientation.anticommutativeIdentity}: ${orientation.anticommutativeValues}`,
      explanation: scene.opposite
        ? `La regla de la mano derecha orienta la normal. Al cerrar los dedos desde ${first} hacia ${second}, el pulgar apunta hacia ${vectorText(scene.normal)}. La orientación de la terna (${first}, ${second}, n) es dextrógira: det(${first}, ${second}, n) = ${orientation.tripleProductDeterminant} > 0. Invertir el orden invierte el resultado: ${orientation.oppositeOrder} = −(${operation}).`
        : "Los vectores son paralelos o alguno es nulo. No determinan un plano ni una dirección normal que pueda normalizarse.",
      orientation,
    },
    {
      title: "Propiedades algebraicas",
      expression: `${anticommutative.reverseOperation} = −(${anticommutative.directOperation})`,
      explanation: anticommutative.explanation + (distributive ? ` Además, distributividad sobre la suma: ${distributive.expressionLeft} = ${distributive.expressionRight}.` : ""),
      anticommutative,
      ...(distributive ? { distributive } : {}),
    },
    ...(showIdentities && identities ? [{
      title: "Inspector de identidades algebraicas",
      expression: "u × v = -(v × u); u × u = 0; (c u) × v = c (u × v); u × (v + w) = (u × v) + (u × w)",
      explanation: identities.summary + " " + identities.identities[0].scalarDotWarning,
      identities,
    }] : []),
    checkCrossProduct(u, v, scene.normal, exact),
  );
  return { scene, operation, resultText, steps, orientation, area: areaInfo, perpendicularity: perpInfo, anticommutative, ...(distributive ? { distributive } : {}), ...(identities ? { identities } : {}) };
}

export function crossProductWithSteps(a: Vector3, b: Vector3): { result: Vector3; steps: CrossStep[] } {
  const [a1, a2, a3] = a;
  const [b1, b2, b3] = b;
  const x = a2 * b3 - a3 * b2;
  const y = a3 * b1 - a1 * b3;
  const z = a1 * b2 - a2 * b1;
  const steps: CrossStep[] = [
    {
      title: "Definición componente a componente",
      expression: "u×v = (u₂v₃ - u₃v₂, u₃v₁ - u₁v₃, u₁v₂ - u₂v₁)",
      explanation: "Cada componente es un determinante 2×2 con signo alterno.",
    },
    {
      title: "Sustitución",
      expression: `(${a2}·${b3} - ${a3}·${b2}, ${a3}·${b1} - ${a1}·${b3}, ${a1}·${b2} - ${a2}·${b1})`,
      explanation: "Se sustituyen los valores numéricos.",
    },
    {
      title: "Resultado",
      expression: `(${x}, ${y}, ${z})`,
      explanation: isParallel(a, b) ? "Vectores paralelos: normal nula." : "Normal orientada según regla de la mano derecha.",
    },
  ];
  return { result: [x, y, z], steps };
}

/**
 * Interpola el vector w hacia un objetivo de colapso.
 * @param w - Vector original
 * @param u, v - Vectores base del paralelepípedo
 * @param factor - Factor de interpolación [0, 1]
 * @param target - "zero": interpola hacia [0,0,0]; "coplanar": interpola hacia proyección en plano u,v
 * @returns Vector w interpolado
 */
export function interpolateCollapseVector(
  w: Vector3,
  u: Vector3,
  v: Vector3,
  factor: number,
  target: "zero" | "coplanar" = "coplanar"
): Vector3 {
  const clampedFactor = Math.max(0, Math.min(1, factor));
  
  if (target === "zero") {
    // Interpola hacia el vector cero
    return [
      w[0] * (1 - clampedFactor),
      w[1] * (1 - clampedFactor),
      w[2] * (1 - clampedFactor),
    ];
  }
  
  // target === "coplanar": interpola hacia la proyección de w en el plano generado por u, v
  // La proyección de w en el plano (u,v) es: w - ((w·n)/|n|²) * n
  // donde n = u × v
  const n = crossProduct(u, v);
  const nMagSq = n[0] * n[0] + n[1] * n[1] + n[2] * n[2];
  
  if (nMagSq < 1e-14) {
    // u y v son paralelos, el plano está degenerado
    // En este caso, interpolar hacia cero
    return [
      w[0] * (1 - clampedFactor),
      w[1] * (1 - clampedFactor),
      w[2] * (1 - clampedFactor),
    ];
  }
  
  // Proyección de w en la normal n
  const wDotN = w[0] * n[0] + w[1] * n[1] + w[2] * n[2];
  const projFactor = wDotN / nMagSq;
  
  // Componente perpendicular al plano (a lo largo de n)
  const wPerp = [
    n[0] * projFactor,
    n[1] * projFactor,
    n[2] * projFactor,
  ];
  
  // Componente paralela al plano
  const wParallel = [
    w[0] - wPerp[0],
    w[1] - wPerp[1],
    w[2] - wPerp[2],
  ];
  
  // Interpola la componente perpendicular hacia cero
  // Al factor=1, w_perp = 0, por lo que w se vuelve coplanar con u,v
  return [
    wParallel[0] + wPerp[0] * (1 - clampedFactor),
    wParallel[1] + wPerp[1] * (1 - clampedFactor),
    wParallel[2] + wPerp[2] * (1 - clampedFactor),
  ];
}

/**
 * Información sobre el estado de colapso del paralelepípedo.
 */
export interface CollapseStudy {
  originalW: Vector3;
  currentW: Vector3;
  factor: number;
  target: "zero" | "coplanar";
  volumeAtFactor: number;
  volumeOriginal: number;
  isCollapsed: boolean;
  explanation: string;
}

/**
 * Calcula el estudio de colapso del paralelepípedo.
 */
export function computeCollapseStudy(
  u: Vector3,
  v: Vector3,
  w: Vector3,
  factor: number,
  target: "zero" | "coplanar" = "coplanar"
): CollapseStudy {
  const currentW = interpolateCollapseVector(w, u, v, factor, target);
  const volumeAtFactor = Math.abs(tripleProduct(u, v, currentW));
  const volumeOriginal = Math.abs(tripleProduct(u, v, w));
  const isCollapsed = volumeAtFactor < 1e-10;
  
  let explanation: string;
  if (isCollapsed) {
    explanation = target === "coplanar"
      ? `El paralelepípedo ha colapsado completamente: el vector w interpolado es coplanar con u y v (volumen = 0).`
      : `El paralelepípedo ha colapsado completamente: el vector w se ha reducido a cero.`;
  } else {
    const percent = (volumeAtFactor / volumeOriginal * 100).toFixed(1);
    explanation = `Factor de colapso: ${(factor * 100).toFixed(1)}%. Volumen actual: ${volumeAtFactor.toFixed(4)} (${percent}% del original ${volumeOriginal.toFixed(4)}).`;
  }
  
  return {
    originalW: w,
    currentW,
    factor,
    target,
    volumeAtFactor,
    volumeOriginal,
    isCollapsed,
    explanation,
  };
}

/**
 * Tipos de errores comunes en producto cruz detectables.
 */
export type CrossProductErrorType =
  | "sign_error_j"           // Signo incorrecto en componente j
  | "sign_error_cross"       // Signo incorrecto en todo el producto cruz
  | "associativity_confusion" // Confusión asociatividad (u×v)×w ≠ u×(v×w)
  | "magnitude_confusion"    // Confusión |u×v| vs |u||v|
  | "commutativity_assumed"  // Asumir u×v = v×u
  | "distributivity_error"   // Error en distributividad
  | "triple_product_sign"    // Signo incorrecto en producto triple
  | "coplanarity_wrong"      // Error en prueba coplanaridad
  | "collinear_not_zero";    // No detectar vectores colineales → resultado 0

/**
 * Información sobre un error detectado en producto cruz.
 */
export interface CrossProductError {
  type: CrossProductErrorType;
  message: string;
  correctExpression: string;
  incorrectExpression: string;
  explanation: string;
  counterexample?: {
    u: Vector3;
    v: Vector3;
    w?: Vector3;
    correctResult: Vector3 | number;
    incorrectResult: Vector3 | number;
  };
}

/**
 * Analiza un cálculo de producto cruz y detecta errores comunes.
 * Retorna lista de errores encontrados con explicación y contraejemplo.
 */
export function detectCrossProductErrors(
  u: Vector3,
  v: Vector3,
  userResult: Vector3,
  userTripleProduct?: number,
  w?: Vector3
): CrossProductError[] {
  const errors: CrossProductError[] = [];
  const correctCross = crossProduct(u, v);
  const correctTriple = w ? tripleProduct(u, v, w) : undefined;
  const correctMagnitude = crossMagnitude(u, v);
  const isCollinear = areExactlyDependent(u, v);

  // 1. Error de signo en componente j (el más común)
  if (userResult[1] !== correctCross[1] && 
      userResult[0] === correctCross[0] && 
      userResult[2] === correctCross[2]) {
    errors.push({
      type: "sign_error_j",
      message: "Signo incorrecto en la componente j (segunda componente)",
      correctExpression: `u × v = (${correctCross.join(", ")})`,
      incorrectExpression: `u × v = (${userResult.join(", ")})`,
      explanation: "La componente j del producto cruz lleva un signo negativo exterior: -(u₁v₃ - u₃v₁). Es el error más frecuente por olvidar la regla de cofactores +/−/+.",
      counterexample: {
        u, v,
        correctResult: correctCross,
        incorrectResult: userResult,
      },
    });
  }

  // 2. Signo completamente invertido (anticonmutatividad confundida)
  if (userResult[0] === -correctCross[0] && 
      userResult[1] === -correctCross[1] && 
      userResult[2] === -correctCross[2]) {
    errors.push({
      type: "sign_error_cross",
      message: "Producto cruz con signo completamente invertido",
      correctExpression: `u × v = (${correctCross.join(", ")})`,
      incorrectExpression: `u × v = (${userResult.join(", ")}) = v × u`,
      explanation: "Se ha calculado v × u en lugar de u × v. El producto cruz es anticonmutativo: u × v = -(v × u).",
      counterexample: {
        u, v,
        correctResult: correctCross,
        incorrectResult: userResult,
      },
    });
  }

  // 3. Confusión con asociatividad
  if (w && userTripleProduct !== undefined) {
    const correctTriple = tripleProduct(u, v, w);
    // Verificar si se asumió (u×v)·w = u·(v×w) incorrectamente
    if (userTripleProduct === correctTriple) {
      // Correcto, pero podríamos detectar si se usó el orden incorrecto
    } else if (userTripleProduct === -correctTriple) {
      errors.push({
        type: "triple_product_sign",
        message: "Signo incorrecto en producto triple escalar",
        correctExpression: `u · (v × w) = ${correctTriple}`,
        incorrectExpression: `u · (v × w) = ${userTripleProduct}`,
        explanation: "El producto triple escalar cambia de signo al intercambiar dos vectores: u·(v×w) = -u·(w×v).",
        counterexample: {
          u, v, w,
          correctResult: correctTriple,
          incorrectResult: userTripleProduct,
        },
      });
    }
  }

  // 4. Error en magnitud: confundir |u×v| con |u||v|
  const userMagnitude = Math.hypot(...userResult);
  if (!isCollinear && Math.abs(userMagnitude - correctMagnitude) > 1e-10) {
    const expectedMagnitude = correctMagnitude;
    if (Math.abs(userMagnitude - uMagnitudeTimesVMagnitude(u, v)) < 1e-10) {
      errors.push({
        type: "magnitude_confusion",
        message: "Confusión entre magnitud del producto cruz y producto de magnitudes",
        correctExpression: `‖u × v‖ = ${expectedMagnitude.toFixed(4)}`,
        incorrectExpression: `‖u × v‖ = ${userMagnitude.toFixed(4)} ≈ ‖u‖·‖v‖ = ${uMagnitudeTimesVMagnitude(u, v).toFixed(4)}`,
        explanation: "La magnitud del producto cruz es ‖u × v‖ = ‖u‖·‖v‖·sen(θ), NO ‖u‖·‖v‖ (eso solo ocurre cuando θ = 90°).",
        counterexample: {
          u, v,
          correctResult: expectedMagnitude,
          incorrectResult: userMagnitude,
        },
      });
    }
  }

  // 5. Asumir conmutatividad (u×v = v×u)
  if (userResult[0] === -correctCross[0] && 
      userResult[1] === -correctCross[1] && 
      userResult[2] === -correctCross[2]) {
    // Ya detectado arriba como sign_error_cross
  } else if (!isCollinear && userResult.every((val, i) => val === correctCross[i])) {
    // Correcto, no hay error
  }

  // 6. No detectar vectores colineales (debería dar 0)
  if (isCollinear && (userResult[0] !== 0 || userResult[1] !== 0 || userResult[2] !== 0)) {
    errors.push({
      type: "collinear_not_zero",
      message: "No se detectaron vectores colineales/paralelos (debería dar vector cero)",
      correctExpression: "u × v = (0, 0, 0) [vectores paralelos]",
      incorrectExpression: `u × v = (${userResult.join(", ")})`,
      explanation: "Vectores paralelos o colineales tienen producto cruz nulo (0, 0, 0) porque sen(θ) = 0.",
      counterexample: {
        u, v,
        correctResult: [0, 0, 0],
        incorrectResult: userResult,
      },
    });
  }

  // 7. Error en prueba de coplanaridad
  if (w && userTripleProduct !== undefined) {
    const correctTriple = tripleProduct(u, v, w);
    const isCoplanar = Math.abs(correctTriple) < 1e-12;
    if (userTripleProduct === 0 && !isCoplanar) {
      errors.push({
        type: "coplanarity_wrong",
        message: "Error en prueba de coplanaridad: se reporta coplanar pero no lo son",
        correctExpression: `u · (v × w) = ${correctTriple} ≠ 0 (no coplanares)`,
        incorrectExpression: `u · (v × w) = 0 (coplanares)`,
        explanation: "El producto triple escalar no es cero, por lo que los vectores NO son coplanares.",
        counterexample: {
          u, v, w,
          correctResult: correctTriple,
          incorrectResult: 0,
        },
      });
    } else if (userTripleProduct !== 0 && isCoplanar) {
      errors.push({
        type: "coplanarity_wrong",
        message: "Error en prueba de coplanaridad: se reporta no coplanar pero sí lo son",
        correctExpression: "u · (v × w) = 0 (coplanares)",
        incorrectExpression: `u · (v × w) = ${userTripleProduct} ≠ 0 (no coplanares)`,
        explanation: "El producto triple escalar es cero, los vectores SON coplanares.",
        counterexample: {
          u, v, w,
          correctResult: 0,
          incorrectResult: userTripleProduct,
        },
      });
    }
  }

  return errors;
}

function uMagnitudeTimesVMagnitude(u: Vector3, v: Vector3): number {
  return Math.hypot(...u) * Math.hypot(...v);
}

/**
 * Genera un ejercicio de corrección con vectores aleatorios y un error introducido.
 * Útil para T019 (desafío visual de signos) y T020 (corrector).
 */
export interface SignChallengeExercise {
  id: string;
  u: Vector3;
  v: Vector3;
  w?: Vector3;
  question: "cross_product" | "triple_product" | "coplanarity" | "magnitude" | "collinearity";
  correctAnswer: Vector3 | number | boolean;
  errorType?: CrossProductErrorType;
  seed: number;
}

export function generateSignChallengeExercise(
  seed: number,
  questionType: SignChallengeExercise["question"] = "cross_product"
): SignChallengeExercise {
  // Simple PRNG based on seed
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const randomInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
  const randomVec = (): Vector3 => [randomInt(-5, 5), randomInt(-5, 5), randomInt(-5, 5)];

  const u = randomVec();
  let v = randomVec();
  let w = randomVec();

  // Asegurar que no sean colineales para preguntas interesantes
  if (questionType === "cross_product" || questionType === "magnitude") {
    while (areExactlyDependent(u, v)) {
      v = randomVec();
    }
  }

  if (questionType === "triple_product" || questionType === "coplanarity") {
    while (areExactlyDependent(u, v) || areExactlyDependent(v, w) || areExactlyDependent(u, w)) {
      w = randomVec();
    }
  }

  let correctAnswer: Vector3 | number | boolean;
  let errorType: CrossProductErrorType | undefined;

  switch (questionType) {
    case "cross_product":
      correctAnswer = crossProduct(u, v);
      errorType = "sign_error_cross";
      break;
    case "triple_product":
      correctAnswer = tripleProduct(u, v, w);
      errorType = "triple_product_sign";
      break;
    case "coplanarity":
      correctAnswer = Math.abs(tripleProduct(u, v, w)) < 1e-12;
      errorType = "coplanarity_wrong";
      break;
    case "magnitude":
      correctAnswer = crossMagnitude(u, v);
      errorType = "magnitude_confusion";
      break;
    case "collinearity":
      correctAnswer = areExactlyDependent(u, v);
      errorType = "collinear_not_zero";
      break;
  }

  return {
    id: `challenge-${seed}-${questionType}`,
    u,
    v,
    w: questionType === "triple_product" || questionType === "coplanarity" ? w : undefined,
    question: questionType,
    correctAnswer,
    errorType,
    seed,
  };
}

/**
 * Información sobre una recta 3D en forma vectorial r(t) = P + t·v
 */
export interface Line3DInfo {
  point: Vector3;
  direction: Vector3;
  tDomain: [number, number];
  isValid: boolean;
  parametric: string;
  symmetric?: string;
  vectorForm: string;
  explanation: string;
}

/**
 * Calcula la información completa de una recta 3D en forma vectorial r(t) = P + t·v.
 * Genera las ecuaciones paramétricas, simétricas y vectorial.
 */
export function computeLine3DInfo(
  point: Vector3,
  direction: Vector3,
  tDomain: [number, number] = [-10, 10]
): Line3DInfo {
  const [px, py, pz] = point;
  const [vx, vy, vz] = direction;

  const isZeroDirection = vx === 0 && vy === 0 && vz === 0;
  
  if (isZeroDirection) {
    return {
      point,
      direction: [0, 0, 0],
      tDomain,
      isValid: false,
      parametric: "Inválida",
      vectorForm: "Inválida",
      explanation: "El vector director es nulo (0, 0, 0). No se puede definir una recta con vector director nulo.",
    };
  }

  // Ecuación vectorial: r(t) = P + t·v
  const vectorForm = `r(t) = (${px}, ${py}, ${pz}) + t·(${vx}, ${vy}, ${vz})`;

  // Ecuaciones paramétricas: x = px + t·vx, y = py + t·vy, z = pz + t·vz
  const parametric = `x = ${px} + ${vx}·t\ny = ${py} + ${vy}·t\nz = ${pz} + ${vz}·t`;

  // Ecuación simétrica: (x - px)/vx = (y - py)/vy = (z - pz)/vz
  // Solo para componentes no nulas
  const symParts: string[] = [];
  if (vx !== 0) symParts.push(`(x − ${px}) / ${vx}`);
  if (vy !== 0) symParts.push(`(y − ${py}) / ${vy}`);
  if (vz !== 0) symParts.push(`(z − ${pz}) / ${vz}`);
  const symmetric = symParts.join(" = ");

  return {
    point,
    direction,
    tDomain,
    isValid: true,
    parametric,
    symmetric,
    vectorForm,
    explanation: isZeroDirection
      ? "Vector director nulo: no define una recta."
      : `Recta que pasa por P(${px}, ${py}, ${pz}) con vector director v = (${vx}, ${vy}, ${vz}). Ecuación vectorial: r(t) = P + t·v.`,
  };
}

/**
 * Información sobre un plano 3D en forma punto-normal: n·(X - P) = 0
 */
export interface Plane3DInfo {
  point: Vector3;
  normal: Vector3;
  isValid: boolean;
  generalEquation: string;
  normalEquation: string;
  intercepts?: { x: number; y: number; z: number };
  explanation: string;
}

/**
 * Calcula la información completa de un plano 3D en forma punto-normal n·(X - P) = 0.
 * Genera la ecuación general Ax + By + Cz + D = 0, ecuación normal y interceptos.
 */
export function computePlane3DInfo(
  point: Vector3,
  normal: Vector3,
  xDomain: [number, number] = [-10, 10],
  yDomain: [number, number] = [-10, 10]
): Plane3DInfo {
  const [px, py, pz] = point;
  const [nx, ny, nz] = normal;

  const isZeroNormal = nx === 0 && ny === 0 && nz === 0;

  if (isZeroNormal) {
    return {
      point,
      normal: [0, 0, 0],
      isValid: false,
      generalEquation: "Inválida",
      normalEquation: "Inválida",
      explanation: "El vector normal es nulo (0, 0, 0). No se puede definir un plano con vector normal nulo.",
    };
  }

  // Ecuación general: n·(X - P) = 0 => nx(x - px) + ny(y - py) + nz(z - pz) = 0
  // => nx·x + ny·y + nz·z - (nx·px + ny·py + nz·pz) = 0
  const D = -(nx * px + ny * py + nz * pz);
  const generalEquation = `${nx}·x + ${ny}·y + ${nz}·z + ${D} = 0`;

  // Ecuación normal (punto-normal): n·(X - P) = 0
  const normalEquation = `(${nx})·(x − ${px}) + (${ny})·(y − ${py}) + (${nz})·(z − ${pz}) = 0`;

  // Interceptos con los ejes
  let intercepts: { x: number; y: number; z: number } | undefined;
  if (nx !== 0 && ny !== 0 && nz !== 0) {
    intercepts = {
      x: -D / nx,
      y: -D / ny,
      z: -D / nz,
    };
  }

  return {
    point,
    normal,
    isValid: true,
    generalEquation,
    normalEquation,
    intercepts,
    explanation: `Plano que pasa por P(${px}, ${py}, ${pz}) con normal n = (${nx}, ${ny}, ${nz}). Ecuación general: ${generalEquation}.`,
  };
}

/**
 * Posición relativa de dos rectas en el espacio.
 */
export interface LineLineRelation {
  type: "coincident" | "parallel" | "secant" | "skew"; // alabeadas = skew
  intersectionPoint?: Vector3;
  distance?: number;
  explanation: string;
  parameters?: { t1: number; t2: number };
}

/**
 * Determina la posición relativa de dos rectas 3D.
 * r1(t) = P1 + t·v1, r2(s) = P2 + s·v2
 */
export function lineLineRelation(
  P1: Vector3, v1: Vector3,
  P2: Vector3, v2: Vector3
): LineLineRelation {
  // Verificar si son paralelas: v1 × v2 = 0
  const cross = crossProduct(v1, v2);
  const crossMag = crossMagnitude(v1, v2);
  const isParallel = crossMag < 1e-12;

  if (isParallel) {
    // Verificar si son coincidentes: (P2 - P1) × v1 = 0
    const P2minusP1: Vector3 = [P2[0] - P1[0], P2[1] - P1[1], P2[2] - P1[2]];
    const crossP = crossProduct(P2minusP1, v1);
    const isCoincident = crossMagnitude(P2minusP1, v1) < 1e-12;

    return {
      type: isCoincident ? "coincident" : "parallel",
      explanation: isCoincident
        ? "Las rectas son coincidentes: tienen el mismo vector director y P2-P1 es paralelo a v1."
        : "Las rectas son paralelas: vectores directores paralelos pero P2-P1 no es paralelo a v1.",
    };
  }

  // No son paralelas: resolver sistema P1 + t·v1 = P2 + s·v2
  // => t·v1 - s·v2 = P2 - P1
  // Sistema de 3 ecuaciones con 2 incógnitas
  const rhs = [P2[0] - P1[0], P2[1] - P1[1], P2[2] - P1[2]];
  
  // Usar las dos primeras ecuaciones para resolver t y s
  const det = v1[0] * (-v2[1]) - v1[1] * (-v2[0]);
  
  if (Math.abs(det) < 1e-12) {
    // El sistema es singular en las dos primeras, probar con otras combinaciones
    // Para simplificar, usamos el método de mínimos cuadrados
    // Construimos la matriz A = [v1, -v2] (3x2) y resolvemos A·[t, s]^T = P2-P1
    // Solución exacta: t = ( (P2-P1)·v1 ) / |v1|^2, s = ( (P2-P1)·v2 ) / |v2|^2
    // Pero esto no garantiza intersección exacta en 3D para rectas no paralelas
    // El método correcto: resolver el sistema sobredeterminado
    return {
      type: "skew",
      explanation: "Las rectas son alabeadas (no paralelas, no secantes, no coplanares).",
    };
  }

  // Resolver sistema 2x2
  const t = (rhs[0] * (-v2[1]) - rhs[1] * (-v2[0])) / det;
  const s = (v1[0] * rhs[1] - v1[1] * rhs[0]) / det;

  // Verificar si la solución satisface la tercera ecuación
  const intersection1: Vector3 = [
    P1[0] + t * v1[0],
    P1[1] + t * v1[1],
    P1[2] + t * v1[2],
  ];
  const intersection2: Vector3 = [
    P2[0] + s * v2[0],
    P2[1] + s * v2[1],
    P2[2] + s * v2[2],
  ];

  const dist = Math.hypot(
    intersection1[0] - intersection2[0],
    intersection1[1] - intersection2[1],
    intersection1[2] - intersection2[2]
  );

  if (dist < 1e-10) {
    // Secantes (se intersectan)
    return {
      type: "secant",
      intersectionPoint: intersection1,
      parameters: { t1: t, t2: s },
      explanation: `Las rectas se intersectan en el punto (${intersection1[0].toFixed(3)}, ${intersection1[1].toFixed(3)}, ${intersection1[2].toFixed(3)}) para t=${t.toFixed(3)}, s=${s.toFixed(3)}.`,
    };
  } else {
    // Alabeadas
    return {
      type: "skew",
      distance: dist,
      explanation: `Las rectas son alabeadas: no son paralelas y no se intersectan. Distancia mínima entre ellas: ${dist.toFixed(4)}.`,
    };
  }
}

/**
 * Intersección de una recta y un plano.
 */
export interface LinePlaneIntersection {
  type: "point" | "line" | "none"; // point = intersección en un punto, line = recta contenida, none = paralela sin intersección
  intersectionPoint?: Vector3;
  parameter?: number;
  explanation: string;
}

/**
 * Intersección de recta r(t) = P + t·v con plano n·(X - P0) = 0.
 */
export function linePlaneIntersection(
  linePoint: Vector3, lineDirection: Vector3,
  planePoint: Vector3, planeNormal: Vector3
): LinePlaneIntersection {
  // Sustituir r(t) en ecuación del plano: n·(P + t·v - P0) = 0
  // n·(P - P0) + t·(n·v) = 0
  // t = -n·(P - P0) / (n·v)
  
  const nDotV = planeNormal[0] * lineDirection[0] + planeNormal[1] * lineDirection[1] + planeNormal[2] * lineDirection[2];
  
  if (Math.abs(nDotV) < 1e-12) {
    // Recta paralela al plano
    const nDotPminusP0 = planeNormal[0] * (linePoint[0] - planePoint[0]) + 
                          planeNormal[1] * (linePoint[1] - planePoint[1]) + 
                          planeNormal[2] * (linePoint[2] - planePoint[2]);
    if (Math.abs(nDotPminusP0) < 1e-12) {
      // Recta contenida en el plano
      return {
        type: "line",
        explanation: "La recta está contenida en el plano (paralela y pasa por un punto del plano).",
      };
    } else {
      // Recta paralela al plano pero no contenida
      return {
        type: "none",
        explanation: "La recta es paralela al plano y no lo intersecta.",
      };
    }
  }

  // Intersección en un punto
  const nDotPminusP0 = planeNormal[0] * (linePoint[0] - planePoint[0]) + 
                        planeNormal[1] * (linePoint[1] - planePoint[1]) + 
                        planeNormal[2] * (linePoint[2] - planePoint[2]);
  const t = -nDotPminusP0 / nDotV;
  
  const intersectionPoint: Vector3 = [
    linePoint[0] + t * lineDirection[0],
    linePoint[1] + t * lineDirection[1],
    linePoint[2] + t * lineDirection[2],
  ];

  return {
    type: "point",
    intersectionPoint,
    parameter: t,
    explanation: `La recta intersecta el plano en el punto (${intersectionPoint[0].toFixed(3)}, ${intersectionPoint[1].toFixed(3)}, ${intersectionPoint[2].toFixed(3)}) para t = ${t.toFixed(3)}.`,
  }
}

/**
 * Información sobre un plano definido por tres puntos no colineales.
 */
export interface PlaneFromPointsInfo {
  point: Vector3;
  normal: Vector3;
  generalEquation: string;
  isValid: boolean;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula el plano que pasa por tres puntos no colineales A, B, C.
 * n = (B - A) × (C - A)
 * Ecuación: n·(X - A) = 0
 */
export function computePlaneFromPoints(
  A: Vector3,
  B: Vector3,
  C: Vector3
): PlaneFromPointsInfo {
  const AB: Vector3 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
  const AC: Vector3 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
  const normal = crossProduct(AB, AC);
  const normalMag = crossMagnitude(AB, AC);

  const isDegenerate = normalMag < 1e-12;
  const [nx, ny, nz] = normal;
  const D = -(nx * A[0] + ny * A[1] + nz * A[2]);
  const generalEq = `${nx}·x + ${ny}·y + ${nz}·z + ${D} = 0`;

  const steps: Array<{ title: string; expression: string; explanation: string }> = [
    {
      title: "Datos",
      expression: `A = (${A.join(", ")}); B = (${B.join(", ")}); C = (${C.join(", ")})`,
      explanation: "Tres puntos en el espacio. El plano pasa por estos tres puntos si no son colineales."
    },
    {
      title: "Vectores AB y AC",
      expression: `AB = B − A = (${AB.join(", ")}); AC = C − A = (${AC.join(", ")})`,
      explanation: "Dos vectores que yacen en el plano."
    },
    {
      title: "Vector normal n = AB × AC",
      expression: `n = (${normal.join(", ")})`,
      explanation: "El producto cruz de dos vectores del plano da un vector perpendicular al plano."
    },
    {
      title: "Ecuación del plano: n·(X − A) = 0",
      expression: generalEq,
      explanation: "Todo punto X del plano satisface que el vector X − A es perpendicular a la normal n."
    }
  ];

  return {
    point: A,
    normal,
    generalEquation: generalEq,
    isValid: !isDegenerate,
    explanation: isDegenerate
      ? "Los tres puntos son colineales (AB × AC = 0). No definen un plano único."
      : `Plano válido que pasa por A, B, C con normal n = (${normal.join(", ")}) y ecuación ${generalEq}.`,
    steps,
  };
}

/**
 * Información sobre un plano definido por un punto y dos vectores generadores.
 */
export interface PlaneFromVectorsInfo {
  point: Vector3;
  u: Vector3;
  v: Vector3;
  normal: Vector3;
  generalEquation: string;
  parametricEquation: string;
  isValid: boolean;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula el plano definido por un punto P y dos vectores no paralelos u, v.
 * n = u × v
 * Ecuación paramétrica: X = P + s·u + t·v
 */
export function computePlaneFromVectors(
  point: Vector3,
  u: Vector3,
  v: Vector3
): PlaneFromVectorsInfo {
  const normal = crossProduct(u, v);
  const normalMag = crossMagnitude(u, v);
  const isDegenerate = normalMag < 1e-12;
  const [nx, ny, nz] = normal;
  const D = -(nx * point[0] + ny * point[1] + nz * point[2]);
  const generalEq = `${nx}·x + ${ny}·y + ${nz}·z + ${D} = 0`;
  const parametricEq = `X = (${point.join(", ")}) + s·(${u.join(", ")}) + t·(${v.join(", ")})`;

  const steps: Array<{ title: string; expression: string; explanation: string }> = [
    {
      title: "Datos",
      expression: `P = (${point.join(", ")}); u = (${u.join(", ")}); v = (${v.join(", ")})`,
      explanation: "Un punto del plano y dos vectores generadores no paralelos."
    },
    {
      title: "Vector normal n = u × v",
      expression: `n = (${normal.join(", ")})`,
      explanation: "El producto cruz de los dos vectores generadores da la normal al plano."
    },
    {
      title: "Ecuación vectorial/paramétrica",
      expression: parametricEq,
      explanation: "Todo punto del plano se expresa como combinación lineal de u y v más el punto base."
    },
    {
      title: "Ecuación general",
      expression: generalEq,
      explanation: "Forma implícita del plano."
    }
  ];

  return {
    point,
    u,
    v,
    normal,
    generalEquation: generalEq,
    parametricEquation: parametricEq,
    isValid: !isDegenerate,
    explanation: isDegenerate
      ? "Los vectores u y v son paralelos (u × v = 0). No definen un plano único."
      : `Plano válido que pasa por P con generadores u, v. Normal n = (${normal.join(", ")}) y ecuación ${generalEq}.`,
    steps,
  };
}

/**
 * Información sobre intersección de dos planos.
 */
export interface PlanePlaneIntersection {
  type: "line" | "parallel" | "coincident";
  linePoint?: Vector3;
  lineDirection?: Vector3;
  explanation: string;
}

/**
 * Intersección de dos planos: n1·(X - P1) = 0 y n2·(X - P2) = 0
 * La recta de intersección tiene dirección n1 × n2
 * Buscamos un punto que pertenezca a ambos planos resolviendo el sistema 2x2
 */
export function planePlaneIntersection(
  plane1Point: Vector3, plane1Normal: Vector3,
  plane2Point: Vector3, plane2Normal: Vector3
): PlanePlaneIntersection {
  // Verificar si normales son paralelas
  const cross = crossProduct(plane1Normal, plane2Normal);
  const crossMag = crossMagnitude(plane1Normal, plane2Normal);
  const isParallel = crossMag < 1e-12;

  if (isParallel) {
    // Verificar si son coincidentes: P2 - P1 debe ser perpendicular a n1
    const P2minusP1: Vector3 = [plane2Point[0] - plane1Point[0], plane2Point[1] - plane1Point[1], plane2Point[2] - plane1Point[2]];
    const dot = plane1Normal[0] * P2minusP1[0] + plane1Normal[1] * P2minusP1[1] + plane1Normal[2] * P2minusP1[2];
    const isCoincident = Math.abs(dot) < 1e-12;

    return {
      type: isCoincident ? "coincident" : "parallel",
      explanation: isCoincident
        ? "Los planos son coincidentes: tienen la misma normal y P2 − P1 es perpendicular a n1."
        : "Los planos son paralelos y distintos: mismas normales pero P2 − P1 no es perpendicular a n1.",
    };
  }

  // No son paralelas: la intersección es una recta con dirección n1 × n2
  const direction = crossProduct(plane1Normal, plane2Normal);

  // Buscar un punto en la intersección resolviendo el sistema 2x2
  // n1·X = -D1, n2·X = -D2
  const D1 = -(plane1Normal[0] * plane1Point[0] + plane1Normal[1] * plane1Point[1] + plane1Normal[2] * plane1Point[2]);
  const D2 = -(plane2Normal[0] * plane2Point[0] + plane2Normal[1] * plane2Point[1] + plane2Normal[2] * plane2Point[2]);

  // Resolver usando dos ecuaciones, fijando una variable
  let point: Vector3 = [0, 0, 0];

  // Probar fijar z = 0, luego y = 0, luego x = 0
  if (Math.abs(direction[2]) > 1e-12) {
    // Resolver para x, y con z = 0
    const det = plane1Normal[0] * plane2Normal[1] - plane1Normal[1] * plane2Normal[0];
    if (Math.abs(det) > 1e-12) {
      const x = (-D1 * plane2Normal[1] + D2 * plane1Normal[1]) / det;
      const y = (plane1Normal[0] * (-D2) - plane2Normal[0] * (-D1)) / det;
      point = [x, y, 0];
    } else {
      // Probar con y = 0
      const det2 = plane1Normal[0] * plane2Normal[2] - plane1Normal[2] * plane2Normal[0];
      if (Math.abs(det2) > 1e-12) {
        const x = (-D1 * plane2Normal[2] + D2 * plane1Normal[2]) / det2;
        const z = (plane1Normal[0] * (-D2) - plane2Normal[0] * (-D1)) / det2;
        point = [x, 0, z];
      }
    }
    } else if (Math.abs(direction[1]) > 1e-12) {
      const y = (-D1 * plane2Normal[2] + D2 * plane1Normal[2]) / (plane1Normal[1] * plane2Normal[2] - plane1Normal[2] * plane2Normal[1]);
      const z = (plane1Normal[1] * (-D2) - plane2Normal[1] * (-D1)) / (plane1Normal[1] * plane2Normal[2] - plane1Normal[2] * plane2Normal[1]);
      point = [0, y, z];
    } else if (Math.abs(direction[0]) > 1e-12) {
      const x = (-D1 * plane2Normal[2] + D2 * plane1Normal[2]) / (plane1Normal[0] * plane2Normal[2] - plane1Normal[2] * plane2Normal[0]);
      const z = (plane1Normal[0] * (-D2) - plane2Normal[0] * (-D1)) / (plane1Normal[0] * plane2Normal[2] - plane1Normal[2] * plane2Normal[0]);
      point = [x, 0, z];
    } else {
      point = [0, 0, 0];
    }

  return {
    type: "line",
    linePoint: point,
    lineDirection: cross,
    explanation: `Los planos se intersectan en una recta con dirección ${cross.join(", ")} que pasa por el punto (${point[0].toFixed(3)}, ${point[1].toFixed(3)}, ${point[2].toFixed(3)}).`,
  };
}

/**
 * Información sobre intersección de tres planos.
 */
export interface ThreePlanesIntersection {
  type: "point" | "line" | "plane" | "empty";
  point?: Vector3;
  linePoint?: Vector3;
  lineDirection?: Vector3;
  planeNormal?: Vector3;
  planePoint?: Vector3;
  rank: number;
  augmentedRank: number;
  explanation: string;
}

/**
 * Intersección de tres planos.
 * Resuelve el sistema lineal 3x3 y analiza rangos.
 */
export function threePlanesIntersection(
  plane1Point: Vector3, plane1Normal: Vector3,
  plane2Point: Vector3, plane2Normal: Vector3,
  plane3Point: Vector3, plane3Normal: Vector3
): ThreePlanesIntersection {
  // Matriz de coeficientes (normales como filas)
  const A = [
    [...plane1Normal],
    [...plane2Normal],
    [...plane3Normal],
  ];
  // Vector de términos independientes
  const b = [
    -(plane1Normal[0] * plane1Point[0] + plane1Normal[1] * plane1Point[1] + plane1Normal[2] * plane1Point[2]),
    -(plane2Normal[0] * plane2Point[0] + plane2Normal[1] * plane2Point[1] + plane2Normal[2] * plane2Point[2]),
    -(plane3Normal[0] * plane3Point[0] + plane3Normal[1] * plane3Point[1] + plane3Normal[2] * plane3Point[2]),
  ];

  // Determinante de A
  const detA = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
    - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
    + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  // Matriz aumentada [A|b]
  const augmentedRank = computeAugmentedRank(A, b);
  const rankA = computeRank(A);

  if (Math.abs(detA) > 1e-12) {
    // Sistema compatible determinado: intersección en un punto
    // Resolver usando regla de Cramer
    const x = determinant3x3([
      [b[0], A[0][1], A[0][2]],
      [b[1], A[1][1], A[1][2]],
      [b[2], A[2][1], A[2][2]],
    ]) / detA;
    const y = determinant3x3([
      [A[0][0], b[0], A[0][2]],
      [A[1][0], b[1], A[1][2]],
      [A[2][0], b[1], A[2][2]],
    ]) / detA;
    const z = determinant3x3([
      [A[0][0], A[0][1], b[0]],
      [A[1][0], A[1][1], b[1]],
      [A[2][0], A[2][1], b[2]],
    ]) / detA;

    return {
      type: "point",
      point: [x, y, z],
      rank: 3,
      augmentedRank: 3,
      explanation: `Los tres planos se intersectan en un punto único (${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}). Rango de la matriz = 3, rango aumentado = 3.`,
    };
  }

  if (augmentedRank === rankA) {
    if (rankA === 2) {
      // Intersección en una recta
      // Encontrar dirección como producto cruz de dos normales no paralelas
      let direction = crossProduct(plane1Normal, plane2Normal);
      if (crossMagnitude(plane1Normal, plane2Normal) < 1e-12) {
        direction = crossProduct(plane1Normal, plane3Normal);
      }
      // Buscar un punto
      const point = findPointInThreePlanes(plane1Point, plane1Normal, plane2Point, plane2Normal, plane3Point, plane3Normal);

      return {
        type: "line",
        linePoint: point,
        lineDirection: direction,
        rank: 2,
        augmentedRank: 2,
        explanation: `Los tres planos se intersectan en una recta. Rango = 2, rango aumentado = 2.`,
      };
    } else if (rankA === 1) {
      // Los tres planos coinciden
      return {
        type: "plane",
        planeNormal: plane1Normal,
        planePoint: plane1Point,
        rank: 1,
        augmentedRank: 1,
        explanation: "Los tres planos son coincidentes (el mismo plano). Rango = 1, rango aumentado = 1.",
      };
    }
  }

  // incompatible: rango aumentado > rango
  return {
    type: "empty",
    rank: rankA,
    augmentedRank: augmentedRank,
    explanation: `Los tres planos no tienen intersección común (conjunto vacío). Rango = ${rankA}, rango aumentado = ${augmentedRank}.`,
  };
}

function determinant3x3(M: number[][]): number {
  return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
    - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
    + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
}

function computeRank(M: number[][]): number {
  // Simplificación: para matrices 3x3
  const det = determinant3x3(M);
  if (Math.abs(det) > 1e-12) return 3;
  
  // Verificar rango 2: algún menor 2x2 no nulo
  const minors2x2 = [
    M[0][0] * M[1][1] - M[0][1] * M[1][0],
    M[0][0] * M[1][2] - M[0][2] * M[1][0],
    M[0][1] * M[1][2] - M[0][2] * M[1][1],
    M[0][0] * M[2][1] - M[0][1] * M[2][0],
    M[0][0] * M[2][2] - M[0][2] * M[2][0],
    M[0][1] * M[2][2] - M[0][2] * M[2][1],
    M[1][0] * M[2][1] - M[1][1] * M[2][0],
    M[1][0] * M[2][2] - M[1][2] * M[2][0],
    M[1][1] * M[2][2] - M[1][2] * M[2][1],
  ];
  if (minors2x2.some(m => Math.abs(m) > 1e-12)) return 2;
  
  // Rango 1 si alguna fila/columna no nula
  if (M.flat().some(v => Math.abs(v) > 1e-12)) return 1;
  
  return 0;
}

function computeAugmentedRank(A: number[][], b: number[]): number {
  const M = [A[0].concat(b[0]), A[1].concat(b[1]), A[2].concat(b[2])];
  // Para matriz 3x4, usar misma lógica simplificada
  const det = determinant3x3(M);
  if (Math.abs(det) > 1e-12) return 3;
  return computeRank(A); // Aproximación
}

function findPointInThreePlanes(
  P1: Vector3, n1: Vector3,
  P2: Vector3, n2: Vector3,
  P3: Vector3, n3: Vector3
): Vector3 {
  // Usar intersección de dos planos y verificar en el tercero
  const inter12 = planePlaneIntersection(P1, n1, P2, n2);
  if (inter12.type === "line" && inter12.lineDirection && inter12.linePoint) {
    // Verificar si la recta está en el tercer plano
    const dot = n3[0] * inter12.lineDirection[0] + n3[1] * inter12.lineDirection[1] + n3[2] * inter12.lineDirection[2];
    const nDotP = n3[0] * inter12.linePoint[0] + n3[1] * inter12.linePoint[1] + n3[2] * inter12.linePoint[2];
    const D3 = -(n3[0] * P3[0] + n3[1] * P3[1] + n3[2] * P3[2]);
    if (Math.abs(nDotP + D3) < 1e-12) {
      return inter12.linePoint;
    }
  }
  return [0, 0, 0];
}

/**
 * Ángulo entre dos rectas usando sus vectores directores.
 */
export interface AngleBetweenLinesInfo {
  angleRad: number;
  angleDeg: number;
  acuteAngleRad: number;
  acuteAngleDeg: number;
  isPerpendicular: boolean;
  isParallel: boolean;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula el ángulo entre dos rectas dadas por sus vectores directores.
 */
export function angleBetweenLines(v1: Vector3, v2: Vector3): AngleBetweenLinesInfo {
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const mag1 = Math.hypot(...v1);
  const mag2 = Math.hypot(...v2);
  
  if (mag1 < 1e-12 || mag2 < 1e-12) {
    return {
      angleRad: 0,
      angleDeg: 0,
      acuteAngleRad: 0,
      acuteAngleDeg: 0,
      isPerpendicular: false,
      isParallel: true,
      explanation: "Al menos un vector director es nulo.",
      steps: [{ title: "Error", expression: "", explanation: "Vector director nulo no define una recta." }],
    };
  }

  const cosTheta = dot / (mag1 * mag2);
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  const theta = Math.acos(clampedCos);
  const acuteTheta = theta > Math.PI / 2 ? Math.PI - theta : theta;
  
  const isPerpendicular = Math.abs(dot) < 1e-12;
  const isParallel = crossMagnitude(v1, v2) < 1e-12;

  return {
    angleRad: theta,
    angleDeg: (theta * 180) / Math.PI,
    acuteAngleRad: acuteTheta,
    acuteAngleDeg: (acuteTheta * 180) / Math.PI,
    isPerpendicular,
    isParallel,
    explanation: isParallel 
      ? "Las rectas son paralelas (ángulo 0° o 180°)."
      : isPerpendicular
        ? "Las rectas son perpendiculares (ángulo 90°)."
        : `El ángulo entre las rectas es ${acuteTheta.toFixed(2)} rad (${(acuteTheta * 180 / Math.PI).toFixed(2)}°). El ángulo orientado es ${theta.toFixed(2)} rad (${(theta * 180 / Math.PI).toFixed(2)}°).`,
    steps: [
      { title: "Datos", expression: `v₁ = (${v1.join(", ")}); v₂ = (${v2.join(", ")})`, explanation: "Vectores directores de las dos rectas." },
      { title: "Producto escalar", expression: `v₁ · v₂ = ${dot.toFixed(4)}`, explanation: "Producto escalar de los vectores directores." },
      { title: "Magnitudes", expression: `‖v₁‖ = ${mag1.toFixed(4)}; ‖v₂‖ = ${mag2.toFixed(4)}`, explanation: "Normas de los vectores directores." },
      { title: "Coseno del ángulo", expression: `cos θ = ${cosTheta.toFixed(4)}`, explanation: "cos θ = (v₁ · v₂) / (‖v₁‖ · ‖v₂‖)." },
      { title: "Ángulo", expression: `θ = arccos(${clampedCos.toFixed(4)}) = ${theta.toFixed(4)} rad = ${(theta * 180 / Math.PI).toFixed(2)}°`, explanation: "Ángulo orientado entre los vectores." },
      { title: "Ángulo agudo", expression: `min(θ, π − θ) = ${acuteTheta.toFixed(4)} rad = ${(acuteTheta * 180 / Math.PI).toFixed(2)}°`, explanation: "El ángulo entre rectas siempre se toma agudo o recto (≤ 90°)." },
    ],
  };
}

/**
 * Ángulo entre dos planos usando sus normales.
 */
export interface AngleBetweenPlanesInfo {
  angleRad: number;
  angleDeg: number;
  acuteAngleRad: number;
  acuteAngleDeg: number;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula el ángulo entre dos planos (ángulo agudo entre sus normales).
 */
export function angleBetweenPlanes(n1: Vector3, n2: Vector3): AngleBetweenPlanesInfo {
  const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
  const mag1 = Math.hypot(...n1);
  const mag2 = Math.hypot(...n2);
  
  if (mag1 < 1e-12 || mag2 < 1e-12) {
    return {
      angleRad: 0,
      angleDeg: 0,
      acuteAngleRad: 0,
      acuteAngleDeg: 0,
      explanation: "Al menos una normal es nula.",
      steps: [{ title: "Error", expression: "", explanation: "Normal nula no define un plano." }],
    };
  }

  const cosTheta = dot / (mag1 * mag2);
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  const theta = Math.acos(clampedCos);
  // Ángulo agudo entre planos = min(θ, π - θ) donde θ es ángulo entre normales
  const acuteTheta = theta > Math.PI / 2 ? Math.PI - theta : theta;
  
  return {
    angleRad: theta,
    angleDeg: (theta * 180) / Math.PI,
    acuteAngleRad: acuteTheta,
    acuteAngleDeg: (acuteTheta * 180) / Math.PI,
    explanation: `El ángulo agudo entre los planos es ${acuteTheta.toFixed(2)} rad (${(acuteTheta * 180 / Math.PI).toFixed(2)}°). El ángulo entre las normales orientadas es ${theta.toFixed(2)} rad (${(theta * 180 / Math.PI).toFixed(2)}°).`,
    steps: [
      { title: "Datos", expression: `n₁ = (${n1.join(", ")}); n₂ = (${n2.join(", ")})`, explanation: "Vectores normales de los dos planos." },
      { title: "Producto escalar", expression: `n₁ · n₂ = ${dot.toFixed(4)}`, explanation: "Producto escalar de las normales." },
      { title: "Magnitudes", expression: `‖n₁‖ = ${mag1.toFixed(4)}; ‖n₂‖ = ${mag2.toFixed(4)}`, explanation: "Normas de los vectores normales." },
      { title: "Coseno del ángulo entre normales", expression: `cos θ = ${cosTheta.toFixed(4)}`, explanation: "cos θ = (n₁ · n₂) / (‖n₁‖ · ‖n₂‖)." },
      { title: "Ángulo entre normales", expression: `θ = arccos(${clampedCos.toFixed(4)}) = ${theta.toFixed(4)} rad = ${(theta * 180 / Math.PI).toFixed(2)}°`, explanation: "Ángulo orientado entre las normales." },
      { title: "Ángulo agudo entre planos", expression: `min(θ, π − θ) = ${acuteTheta.toFixed(4)} rad = ${(acuteTheta * 180 / Math.PI).toFixed(2)}°`, explanation: "El ángulo entre planos siempre se toma agudo (≤ 90°)." },
    ],
  };
}

/**
 * Ángulo entre una recta y un plano.
 */
export interface LinePlaneAngleInfo {
  angleRad: number;
  angleDeg: number;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula el ángulo entre una recta (vector director v) y un plano (normal n).
 * El ángulo entre recta y plano es el complementario del ángulo entre v y n:
 * sin(θ) = |v · n| / (‖v‖ ‖n‖)
 */
export function linePlaneAngle(lineDirection: Vector3, planeNormal: Vector3): LinePlaneAngleInfo {
  const dot = lineDirection[0] * planeNormal[0] + lineDirection[1] * planeNormal[1] + lineDirection[2] * planeNormal[2];
  const magV = Math.hypot(...lineDirection);
  const magN = Math.hypot(...planeNormal);
  
  if (magV < 1e-12 || magN < 1e-12) {
    return {
      angleRad: 0,
      angleDeg: 0,
      explanation: "Vector director o normal nulo.",
      steps: [{ title: "Error", expression: "", explanation: "Vector director o normal nulo no define ángulo." }],
    };
  }

  const absDot = Math.abs(dot);
  const sinTheta = absDot / (magV * magN);
  const clampedSin = Math.min(1, sinTheta);
  const theta = Math.asin(clampedSin);
  
  return {
    angleRad: theta,
    angleDeg: (theta * 180) / Math.PI,
    explanation: `El ángulo entre la recta y el plano es ${theta.toFixed(2)} rad (${(theta * 180 / Math.PI).toFixed(2)}°).`,
    steps: [
      { title: "Datos", expression: `v = (${lineDirection.join(", ")}); n = (${planeNormal.join(", ")})`, explanation: "Vector director de la recta y normal del plano." },
      { title: "Producto escalar absoluto", expression: `|v · n| = ${absDot.toFixed(4)}`, explanation: "Valor absoluto del producto escalar entre v y n." },
      { title: "Magnitudes", expression: `‖v‖ = ${magV.toFixed(4)}; ‖n‖ = ${magN.toFixed(4)}`, explanation: "Normas del vector director y la normal." },
      { title: "Seno del ángulo", expression: `sin θ = |v · n| / (‖v‖ · ‖n‖) = ${sinTheta.toFixed(4)}`, explanation: "El ángulo entre recta y plano es el complementario del ángulo entre v y n." },
      { title: "Ángulo", expression: `θ = arcsin(${clampedSin.toFixed(4)}) = ${theta.toFixed(4)} rad = ${(theta * 180 / Math.PI).toFixed(2)}°`, explanation: "Ángulo entre la recta y el plano (siempre ≤ 90°)." },
    ],
  };
}

/**
 * Distancia de un punto a un plano.
 */
export interface PointPlaneDistanceInfo {
  distance: number;
  signedDistance: number;
  footOfPerpendicular: Vector3;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula la distancia de un punto a un plano.
 */
export function pointPlaneDistance(
  point: Vector3,
  planePoint: Vector3,
  planeNormal: Vector3
): PointPlaneDistanceInfo {
  const [px, py, pz] = point;
  const [p0x, p0y, p0z] = planePoint;
  const [nx, ny, nz] = planeNormal;
  
  const D = -(nx * p0x + ny * p0y + nz * p0z);
  const signedDist = (nx * px + ny * py + nz * pz + D) / Math.hypot(nx, ny, nz);
  const distance = Math.abs(signedDist);
  
  // Pie del perpendicular: punto - (signedDist) * n_hat
  const magN = Math.hypot(nx, ny, nz);
  const nHat: Vector3 = [nx / magN, ny / magN, nz / magN];
  const foot: Vector3 = [
    px - signedDist * nHat[0],
    py - signedDist * nHat[1],
    pz - signedDist * nHat[2],
  ];

  return {
    distance,
    signedDistance: signedDist,
    footOfPerpendicular: foot,
    explanation: `La distancia del punto (${px}, ${py}, ${pz}) al plano es ${distance.toFixed(4)}. El pie del perpendicular es (${foot[0].toFixed(3)}, ${foot[1].toFixed(3)}, ${foot[2].toFixed(3)}).`,
    steps: [
      { title: "Datos", expression: `P = (${point.join(", ")}); Plano: n·(X − P₀) = 0`, explanation: "Punto y plano en forma punto-normal." },
      { title: "Ecuación del plano", expression: `n·(X − P₀) = 0 => ${planeNormal.join("·")}·(X − ${planePoint.join("−")}) = 0`, explanation: "Ecuación punto-normal del plano." },
      { title: "Distancia con signo", expression: `d = (n·P + D) / ‖n‖`, explanation: "Distancia con signo = (n·P + D) / ‖n‖ donde D = −n·P₀." },
      { title: "Distancia absoluta", expression: `|d| = ${distance.toFixed(4)}`, explanation: "La distancia siempre es no negativa." },
      { title: "Pie del perpendicular", expression: `P − d·n̂ = (${foot.map(f => f.toFixed(3)).join(", ")})`, explanation: "Proyección ortogonal del punto sobre el plano." },
    ],
  };
}

/**
 * Distancia de un punto a una recta.
 */
export interface PointLineDistanceInfo {
  distance: number;
  footOfPerpendicular: Vector3;
  parameter: number;
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula la distancia de un punto a una recta r(t) = P + t·v.
 */
export function pointLineDistance(
  point: Vector3,
  linePoint: Vector3,
  lineDirection: Vector3
): PointLineDistanceInfo {
  const w: Vector3 = [point[0] - linePoint[0], point[1] - linePoint[1], point[2] - linePoint[2]];
  const v = lineDirection;
  
  const vMagSq = v[0]*v[0] + v[1]*v[1] + v[2]*v[2];
  if (vMagSq < 1e-14) {
    return {
      distance: Math.hypot(...w),
      footOfPerpendicular: linePoint,
      parameter: 0,
      explanation: "Vector director nulo: distancia = distancia al punto base.",
      steps: [{ title: "Error", expression: "", explanation: "Vector director nulo." }],
    };
  }

  const dot = w[0]*v[0] + w[1]*v[1] + w[2]*v[2];
  const t = dot / vMagSq;
  
  const foot: Vector3 = [
    linePoint[0] + t * v[0],
    linePoint[1] + t * v[1],
    linePoint[2] + t * v[2],
  ];
  
  const diff: Vector3 = [point[0] - foot[0], point[1] - foot[1], point[2] - foot[2]];
  const distance = Math.hypot(...diff);

  return {
    distance,
    footOfPerpendicular: foot,
    parameter: t,
    explanation: `La distancia del punto a la recta es ${distance.toFixed(4)}. El pie del perpendicular está en t = ${t.toFixed(3)}.`,
    steps: [
      { title: "Datos", expression: `P = (${point.join(", ")}); Recta: X = P₀ + t·v`, explanation: "Punto y recta en forma vectorial." },
      { title: "Vector P₀P", expression: `w = P − P₀ = (${w.join(", ")})`, explanation: "Vector desde el punto base de la recta al punto dado." },
      { title: "Proyección escalar", expression: `t = (w · v) / ‖v‖² = ${dot.toFixed(3)} / ${vMagSq.toFixed(3)} = ${t.toFixed(3)}`, explanation: "Parámetro t que da el pie del perpendicular." },
      { title: "Pie del perpendicular", expression: `X = P₀ + t·v = (${foot.map(f => f.toFixed(3)).join(", ")})`, explanation: "Punto de la recta más cercano a P." },
      { title: "Distancia", expression: `dist = ‖P − X‖ = ${distance.toFixed(4)}`, explanation: "Norma del vector diferencia." },
    ],
  };
}

/**
 * Distancia entre dos rectas alabeadas.
 */
export interface LinesDistanceInfo {
  distance: number;
  closestPoints: { onLine1: Vector3; onLine2: Vector3 };
  explanation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
}

/**
 * Calcula la distancia mínima entre dos rectas 3D.
 */
export function linesDistance(
  P1: Vector3, v1: Vector3,
  P2: Vector3, v2: Vector3
): LinesDistanceInfo {
  // Vector entre puntos base
  const w0: Vector3 = [P2[0] - P1[0], P2[1] - P1[1], P2[2] - P1[2]];
  
  // Productos escalares
  const a = v1[0]*v1[0] + v1[1]*v1[1] + v1[2]*v1[2];  // |v1|²
  const b = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];  // v1·v2
  const c = v2[0]*v2[0] + v2[1]*v2[1] + v2[2]*v2[2];  // |v2|²
  const d = v1[0]*w0[0] + v1[1]*w0[1] + v1[2]*w0[2];  // v1·w0
  const e = v2[0]*w0[0] + v2[1]*w0[1] + v2[2]*w0[2];  // v2·w0
  
  const denom = a*c - b*b;
  
  if (Math.abs(denom) < 1e-12) {
    // Rectas paralelas: distancia = distancia de P2 a recta 1
    const lineDist = pointLineDistance(P2, P1, v1);
    return {
      distance: lineDist.distance,
      closestPoints: { onLine1: lineDist.footOfPerpendicular, onLine2: P2 },
      explanation: "Rectas paralelas: distancia = distancia de un punto de la segunda a la primera recta.",
      steps: [{ title: "Caso paralelo", expression: "", explanation: "Las rectas son paralelas o colineales." }],
    };
  }

  const s = (b*e - c*d) / denom;
  const t = (a*e - b*d) / denom;

  const closest1: Vector3 = [P1[0] + s*v1[0], P1[1] + s*v1[1], P1[2] + s*v1[2]];
  const closest2: Vector3 = [P2[0] + t*v2[0], P2[1] + t*v2[1], P2[2] + t*v2[2]];
  
  const diff: Vector3 = [closest1[0] - closest2[0], closest1[1] - closest2[1], closest1[2] - closest2[2]];
  const distance = Math.hypot(...diff);

  return {
    distance,
    closestPoints: { onLine1: closest1, onLine2: closest2 },
    explanation: `La distancia mínima entre las rectas es ${distance.toFixed(4)}. Puntos más cercanos: L1(${closest1.map(x => x.toFixed(3)).join(", ")}) y L2(${closest2.map(x => x.toFixed(3)).join(", ")}).`,
    steps: [
      { title: "Datos", expression: `L₁: P₁ + s·v₁; L₂: P₂ + t·v₂`, explanation: "Dos rectas en forma paramétrica." },
      { title: "Parámetros óptimos", expression: `s = ${t.toFixed(3)}; t = ${s.toFixed(3)}`, explanation: "Parámetros que minimizan la distancia." },
      { title: "Puntos más cercanos", expression: `L₁(${closest1.map(x => x.toFixed(3)).join(", ")}); L₂(${closest2.map(x => x.toFixed(3)).join(", ")})`, explanation: "Puntos donde se alcanza la distancia mínima." },
      { title: "Distancia", expression: `dist = ${distance.toFixed(4)}`, explanation: "Distancia euclidiana entre los puntos más cercanos." },
    ],
  };
}
