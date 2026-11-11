/**
 * Operaciones para cónicas 2D (circunferencia, elipse, parábola, hipérbola).
 * Funciones puras, testeables, sin dependencias de React.
 */

import type { Vector2 } from "./vectorOps.js";

export type ConicType = "circle" | "ellipse" | "parabola" | "hyperbola" | "degenerate";

export type ConicMode = "focus-directrix" | "foci" | "center-radius" | "center-axes" | "general" | "three-points" | "focus-point";

/**
 * Ecuación general de una cónica: Ax² + Bxy + Cy² + Dx + Ey + F = 0
 */
export interface GeneralConicEquation {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
}

export interface ConicInfo {
  type: ConicType;
  mode: ConicMode;
  
  // Propiedades geométricas
  center?: [number, number];
  focus?: [number, number];
  focus1?: [number, number];
  focus2?: [number, number];
  directrix?: { A: number; B: number; C: number };
  eccentricity?: number;
  sumDistances?: number; // para elipse: 2a
  diffDistances?: number; // para hipérbola: 2a
  directrixPoint?: [number, number]; // punto en la directriz
  directrixNormal?: [number, number]; // vector normal a la directriz
  semiMajorAxis?: number; // a
  semiMinorAxis?: number; // b
  radius?: number;
  rotation?: number; // radianes
  
  // Ecuaciones
  generalEquation?: string; // Ax² + Bxy + Cy² + Dx + Ey + F = 0
  standardEquation?: string; // Forma canónica
  parametricEquations?: string; // Para elipse: x = a cos(t), y = b sin(t)
  
  // Elementos geométricos
  vertices?: [number, number][];
  foci?: [number, number][];
  directrices?: { A: number; B: number; C: number }[];
  asymptotes?: { slope: number; intercept: number }[]; // Para hipérbola
  asymptoteEquations?: string[]; // Ecuaciones de asíntotas
  
  // Propiedades métricas
  area?: number; // Para elipse: πab
  perimeter?: number; // Para elipse: aproximación
  focalDistance?: number; // c = sqrt(a² - b²) para elipse, sqrt(a² + b²) para hipérbola
  directrixEquations?: string[];
  latusRectum?: number; // 2b²/a para elipse, 2a(e²-1) para hipérbola, 2p para parábola
  
  // Paso a paso
  steps?: Array<{
    title: string;
    expression: string;
    explanation: string;
  }>;
  
  // Validación
  isValid: boolean;
  explanation: string;
  warnings?: string[];
}

/**
 * Determina el tipo de cónica a partir de la ecuación general Ax² + Bxy + Cy² + Dx + Ey + F = 0
 * Usa el discriminante Δ = B² - 4AC:
 * - Δ < 0: Elipse (círculo si A=C y B=0)
 * - Δ = 0: Parábola
 * - Δ > 0: Hipérbola
 */
export function classifyConic(A: number, B: number, C: number): ConicType {
  const discriminant = B * B - 4 * A * C;
  const epsilon = 1e-12;
  
  if (Math.abs(discriminant) < epsilon) return "parabola";
  if (discriminant < 0) return "ellipse";
  return "hyperbola";
}

/**
 * Convierte una cónica de modo focus-directrix a forma general.
 * Dado foco (fx, fy), directriz Ax + By + C = 0, excentricidad e:
 * Distancia al foco = e * distancia a la directriz
 * (x - fx)² + (y - fy)² = e² * (Ax + By + C)² / (A² + B²)
 */
export function focusDirectrixToGeneral(
  focus: [number, number],
  directrix: { A: number; B: number; C: number },
  eccentricity: number
): GeneralConicEquation {
  const [fx, fy] = focus;
  const { A, B, C } = directrix;
  const e2 = eccentricity * eccentricity;
  const denom = A * A + B * B;
  
  if (denom < 1e-14) {
    throw new Error("Directriz degenerada: A y B no pueden ser ambos cero");
  }
  
  const factor = e2 / denom;
  
  const Aout = A * A * factor - 1;
  const Bout = 2 * A * B * factor;
  const Cout = B * B * factor - 1;
  const Dout = 2 * A * C * factor + 2 * fx;
  const Eout = 2 * B * C * factor + 2 * fy;
  const Fout = C * C * factor - fx * fx - fy * fy;
  
  return { A: Aout, B: Bout, C: Cout, D: Dout, E: Eout, F: Fout };
}

/**
 * Convierte una cónica de modo foci a forma general.
 * Elipse: suma distancias = 2a
 * Hipérbola: |diferencia distancias| = 2a
 */
export function fociToGeneral(
  focus1: [number, number],
  focus2: [number, number],
  sumDistances?: number, // para elipse: 2a
  diffDistances?: number // para hipérbola: 2a
): GeneralConicEquation & { type: "ellipse" | "hyperbola" } {
  const [f1x, f1y] = focus1;
  const [f2x, f2y] = focus2;
  
  if (sumDistances !== undefined) {
    // Elipse: d1 + d2 = 2a
    const a = sumDistances / 2;
    const c = Math.hypot(f2x - f1x, f2y - f1y) / 2;
    
    if (c >= a) {
      throw new Error("Para elipse, la distancia focal debe ser menor que el semieje mayor (c < a)");
    }
    
    const b = Math.sqrt(a * a - c * c);
    const cx = (f1x + f2x) / 2;
    const cy = (f1y + f2y) / 2;
    
    // Rotación para alinear focos con eje x
    const angle = Math.atan2(f2y - f1y, f2x - f1x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // En coordenadas rotadas: x'²/a² + y'²/b² = 1
    // x' = cos(x-cx) + sin(y-cy)
    // y' = -sin(x-cx) + cos(y-cy)
    
    const Aout = (cos * cos) / (a * a) + (sin * sin) / (b * b);
    const Bout = 2 * cos * sin * (1/(a*a) - 1/(b*b));
    const Cout = (sin * sin) / (a * a) + (cos * cos) / (b * b);
    const Dout = -2 * Aout * cx - Bout * cy;
    const Eout = -Bout * cx - 2 * Cout * cy;
    const Fout = Aout * cx * cx + Bout * cx * cy + Cout * cy * cy - 1;
    
    return { A: Aout, B: Bout, C: Cout, D: Dout, E: Eout, F: Fout, type: "ellipse" };
  } else if (diffDistances !== undefined) {
    // Hipérbola: |d1 - d2| = 2a
    const a = diffDistances / 2;
    const c = Math.hypot(f2x - f1x, f2y - f1y) / 2;
    
    if (c <= a) {
      throw new Error("Para hipérbola, la distancia focal debe ser mayor que el semieje transversal (c > a)");
    }
    
    const b = Math.sqrt(c * c - a * a);
    const cx = (f1x + f2x) / 2;
    const cy = (f1y + f2y) / 2;
    
    const angle = Math.atan2(f2y - f1y, f2x - f1x);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // En coordenadas rotadas: x'²/a² - y'²/b² = 1
    const Aout = (cos * cos) / (a * a) - (sin * sin) / (b * b);
    const Bout = 2 * cos * sin * (1/(a*a) + 1/(b*b));
    const Cout = (sin * sin) / (a * a) - (cos * cos) / (b * b);
    const Dout = -2 * Aout * cx - Bout * cy;
    const Eout = -Bout * cx - 2 * Cout * cy;
    const Fout = Aout * cx * cx + Bout * cx * cy + Cout * cy * cy + 1;
    
    return { A: Aout, B: Bout, C: Cout, D: Dout, E: Eout, F: Fout, type: "hyperbola" };
  }
  
  throw new Error("Debe proporcionar sumDistances (elipse) o diffDistances (hipérbola)");
}

/**
 * Convierte circunferencia (centro-radio) a forma general
 * (x - h)² + (y - k)² = r² → x² + y² - 2hx - 2ky + (h² + k² - r²) = 0
 */
export function centerRadiusToGeneral(center: [number, number], radius: number): GeneralConicEquation {
  const [h, k] = center;
  return {
    A: 1, B: 0, C: 1,
    D: -2 * h,
    E: -2 * k,
    F: h * h + k * k - radius * radius
  };
}

/**
 * Convierte elipse (centro-ejes) a forma general
 * (x-h)²/a² + (y-k)²/b² = 1 con rotación θ
 */
export function centerAxesToGeneral(
  center: [number, number],
  semiMajorAxis: number,
  semiMinorAxis: number,
  rotation: number = 0
): GeneralConicEquation {
  const [h, k] = center;
  const a = semiMajorAxis;
  const b = semiMinorAxis;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  
  const a2 = a * a;
  const b2 = b * b;
  
  // Rotación aplicada a la forma canónica x'²/a² + y'²/b² = 1
  const Aout = (cos * cos) / (semiMajorAxis * semiMajorAxis) + (sin * sin) / (semiMinorAxis * semiMinorAxis);
  const Bout = 2 * cos * sin * (1 / (semiMajorAxis * semiMajorAxis) - 1 / (semiMinorAxis * semiMinorAxis));
  const Cout = (sin * sin) / (semiMajorAxis * semiMajorAxis) + (cos * cos) / (semiMinorAxis * semiMinorAxis);
  
  const cx = center[0];
  const cy = center[1];
  
  const Dout = -2 * Aout * cx - Bout * cy;
  const Eout = -Bout * cx - 2 * Cout * cy;
  const Fout = Aout * cx * cx + Bout * cx * cy + Cout * cy * cy - 1;
  
  return { A: Aout, B: Bout, C: Cout, D: Dout, E: Eout, F: Fout };
}

/**
 * Convierte parábola (foco-punto en directriz) a forma general
 * Punto (px, py) en directriz Ax + By + C = 0, foco (fx, fy)
 * Distancia al foco = distancia a directriz
 */
export function focusPointToParabola(
  focus: [number, number],
  directrixPoint: [number, number],
  directrixNormal: [number, number] // vector normal a la directriz
): GeneralConicEquation {
  const [fx, fy] = focus;
  const [dx, dy] = directrixPoint;
  const [nx, ny] = directrixNormal;
  
  // Directriz: nx(x - dx) + ny(y - dy) = 0 → nx*x + ny*y - (nx*dx + ny*dy) = 0
  const A = nx;
  const B = ny;
  const C = -(A * dx + B * dy);
  
  // Parábola: distancia al foco = distancia a directriz
  // (x-fx)² + (y-fy)² = (Ax + By + C)² / (A² + B²)
  const denom = A * A + B * B;
  const factor = 1 / denom;
  
  const Aout = A * A * factor - 1;
  const Bout = 2 * A * B * factor;
  const Cout = B * B * factor - 1;
  const Dout = 2 * A * C * factor + 2 * fx;
  const Eout = 2 * B * C * factor + 2 * fy;
  const Fout = C * C * factor - fx * fx - fy * fy;
  
  return { A: Aout, B: Bout, C: Cout, D: Dout, E: Eout, F: Fout };
}

/**
 * Circunferencia por 3 puntos no colineales
 * Resuelve sistema para encontrar centro y radio
 */
export function circleFromThreePoints(
  A: [number, number],
  B: [number, number],
  C: [number, number]
): { center: [number, number]; radius: number } | { error: string } {
  const [x1, y1] = A;
  const [x2, y2] = B;
  const [x3, y3] = C;
  
  // Verificar colinealidad
  const area = 0.5 * Math.abs(
    A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])
  );
  if (area < 1e-12) {
    return { error: "Los tres puntos son colineales, no definen una circunferencia única" };
  }
  
  // Resolver sistema para centro (h, k):
  // (x1 - h)² + (y1 - k)² = (x2 - h)² + (y2 - k)² = (x3 - h)² + (y3 - k)²
  // 2(x2 - x1)h + 2(y2 - y1)k = x2² - x1² + y2² - y1²
  // 2(x3 - x1)h + 2(y3 - y1)k = x3² - x1² + y3² - y1²
  
  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  if (Math.abs(D) < 1e-12) {
    return { error: "Puntos colineales o casi colineales" };
  }
  
  const h = ((x1*x1 + y1*y1) * (y2 - y3) + (x2*x2 + y2*y2) * (y3 - y1) + (x3*x3 + y3*y3) * (y1 - y2)) / D;
  const k = ((x1*x1 + y1*y1) * (x3 - x2) + (x2*x2 + y2*y2) * (x1 - x3) + (x3*x3 + y3*y3) * (x2 - x1)) / D;
  
  const r = Math.hypot(x1 - h, y1 - k);
  
  return { center: [h, k], radius: r };
}

/**
 * Completa el cuadrado para convertir de general a canónica
 * Ax² + Bxy + Cy² + Dx + Ey + F = 0
 */
export function completeSquare(
  A: number, B: number, C: number, D: number, E: number, F: number
): {
  type: "circle" | "ellipse" | "parabola" | "hyperbola" | "degenerate";
  center?: [number, number];
  rotation?: number;
  semiMajorAxis?: number;
  semiMinorAxis?: number;
  radius?: number;
  vertex?: [number, number];
  focus?: [number, number];
  directrix?: { A: number; B: number; C: number };
  standardEquation: string;
  generalEquation: string;
  steps: Array<{ title: string; expression: string; explanation: string }>;
} {
  const steps: Array<{ title: string; expression: string; explanation: string }> = [];
  
  const discriminant = B * B - 4 * A * C;
  const isParabola = Math.abs(discriminant) < 1e-12;
  const isEllipse = discriminant < 0;
  const isHyperbola = discriminant > 0;
  const isCircle = Math.abs(A - C) < 1e-12 && Math.abs(B) < 1e-12 && isEllipse;
  
  steps.push({
    title: "Ecuación general",
    expression: `${A}x² ${B >= 0 ? "+" : ""}${B}xy ${C >= 0 ? "+" : ""}${C}y² ${D >= 0 ? "+" : ""}${D}x ${E >= 0 ? "+" : ""}${E}y ${F >= 0 ? "+" : ""}${F} = 0`,
    explanation: "Ecuación general de segundo grado: Ax² + Bxy + Cy² + Dx + Ey + F = 0"
  });
  
  steps.push({
    title: "Discriminante",
    expression: `Δ = B² - 4AC = ${B*B - 4*A*C}`,
    explanation: `Δ = B² - 4AC. Δ < 0: elipse/círculo; Δ = 0: parábola; Δ > 0: hipérbola. Aquí Δ = ${(B*B - 4*A*C).toFixed(2)}`
  });
  
  if (isParabola) {
    // Parábola: completar cuadrado en la variable cuadrática
    // Para simplificar, asumimos eje principal alineado o usamos rotación
    return {
      type: "parabola",
      standardEquation: "Forma estándar requiere rotación si B ≠ 0",
      generalEquation: `${A}x² ${B >= 0 ? "+" : ""}${B}xy ${C >= 0 ? "+" : ""}${C}y² ${D >= 0 ? "+" : ""}${D}x ${E >= 0 ? "+" : ""}${E}y ${F >= 0 ? "+" : ""}${F} = 0`,
      steps
    };
  }
  
  if (isEllipse || isCircle) {
    // Elipse/Círculo: completar cuadrado
    if (B !== 0) {
      // Rotación necesaria
      const theta = 0.5 * Math.atan2(B, A - C);
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      
      const Arot = A * cos * cos + B * cos * sin + C * sin * sin;
      const Crot = A * sin * sin - B * cos * sin + C * cos * cos;
      const Drot = D * cos + E * sin;
      const Erot = -D * sin + E * cos;
      
      // Completar cuadrado: Arot(x' + Drot/2Arot)² + Crot(y' + Erot/2Crot)² = (Drot²/4Arot + Erot²/4Crot - F)
      const h = -Drot / (2 * Arot);
      const k = -Erot / (2 * Crot);
      const constTerm = (Drot * Drot) / (4 * Arot) + (Erot * Erot) / (4 * Crot) - F;
      
      if (constTerm <= 0) {
        return {
          type: "degenerate",
          standardEquation: "Elipse degenerada o vacía",
          generalEquation: `${A}x² + ${B}xy + ${C}y² + ${D}x + ${E}y + ${F} = 0`,
          steps: [...steps, { title: "Resultado", expression: "Elipse degenerada (sin puntos reales)", explanation: "El término constante es ≤ 0" }]
        };
      }
      
      const a = Math.sqrt(constTerm / Arot);
      const b = Math.sqrt(constTerm / Crot);
      
      const standardEq = isCircle
        ? `(x' - ${h.toFixed(3)})² + (y' - ${k.toFixed(3)})² = ${(constTerm / Arot).toFixed(3)}`
        : `(x' - ${h.toFixed(3)})²/${a.toFixed(3)}² + (y' - ${k.toFixed(3)})²/${b.toFixed(3)}² = 1`;

      return {
        type: isCircle ? "circle" : "ellipse",
        center: [-h, -k],
        rotation: Math.atan2(B, A - C) / 2,
        semiMajorAxis: Math.max(a, b),
        semiMinorAxis: Math.min(a, b),
        standardEquation: standardEq,
        generalEquation: `${A}x² ${B >= 0 ? "+" : ""}${B}xy ${C >= 0 ? "+" : ""}${C}y² ${D >= 0 ? "+" : ""}${D}x ${E >= 0 ? "+" : ""}${E}y ${F >= 0 ? "+" : ""}${F} = 0`,
        steps: [
          ...steps,
          { title: "Rotación", expression: `θ = ½ arctan(B/(A-C)) = ${theta.toFixed(4)} rad`, explanation: "Rotar para eliminar término xy" },
          { title: "Completar cuadrado", expression: "A'(x'+h)² + C'(y'+k)² = K", explanation: "Completar cuadrado en coordenadas rotadas" },
          { title: "Parámetros", expression: `a = ${a.toFixed(3)}, b = ${b.toFixed(3)}`, explanation: "Semiejes mayor y menor" },
        ],
      };
    }
  }
  
  if (isHyperbola) {
    // Hipérbola: similar a elipse pero con signos diferentes
    // Implementación simplificada
    return {
      type: "hyperbola",
      standardEquation: "Forma estándar requiere rotación si B ≠ 0",
      generalEquation: `${A}x² ${B >= 0 ? "+" : ""}${B}xy ${C >= 0 ? "+" : ""}${C}y² ${D >= 0 ? "+" : ""}${D}x ${E >= 0 ? "+" : ""}${E}y ${F >= 0 ? "+" : ""}${F} = 0`,
      steps
    };
  }
  
  return {
    type: "degenerate",
    standardEquation: "No es una cónica estándar",
    generalEquation: `${A}x² ${B >= 0 ? "+" : ""}${B}xy ${C >= 0 ? "+" : ""}${C}y² ${D >= 0 ? "+" : ""}${D}x ${E >= 0 ? "+" : ""}${E}y ${F >= 0 ? "+" : ""}${F} = 0`,
    steps
  };
}

/**
 * Crea un ConicInfo base a partir de una ecuación general
 */
function createConicInfoFromGeneral(eq: GeneralConicEquation, overrides: Partial<ConicInfo> = {}): ConicInfo {
  return {
    type: "ellipse", // será sobrescrito por classifyConic
    mode: "general",
    isValid: true,
    explanation: "",
    generalEquation: `${eq.A}x² ${eq.B >= 0 ? "+" : ""}${eq.B}xy ${eq.C >= 0 ? "+" : ""}${eq.C}y² ${eq.D >= 0 ? "+" : ""}${eq.D}x ${eq.E >= 0 ? "+" : ""}${eq.E}y ${eq.F >= 0 ? "+" : ""}${eq.F} = 0`,
    ...overrides,
  };
}

/**
 * Identifica cónica a partir de puntos y modo
 */
export function identifyConicFromMode(mode: string, params: any): ConicInfo {
  switch (mode) {
    case "focus-directrix": {
      const eq = focusDirectrixToGeneral(params.focus, params.directrix, params.eccentricity);
      return createConicInfoFromGeneral(eq, { 
        mode: "focus-directrix",
        type: classifyConic(eq.A, eq.B, eq.C),
        eccentricity: params.eccentricity,
        focus: params.focus,
        directrix: params.directrix,
      });
    }
    case "foci": {
      const eq = fociToGeneral(params.focus1, params.focus2, params.sumDistances, params.diffDistances);
      return createConicInfoFromGeneral(eq, {
        mode: "foci",
        type: eq.type,
        focus1: params.focus1,
        focus2: params.focus2,
        sumDistances: params.sumDistances,
        diffDistances: params.diffDistances,
      });
    }
    case "center-radius": {
      const eq = centerRadiusToGeneral(params.center, params.radius);
      return createConicInfoFromGeneral(eq, {
        mode: "center-radius",
        type: "circle",
        center: params.center,
        radius: params.radius,
      });
    }
    case "center-axes": {
      const eq = centerAxesToGeneral(params.center, params.semiMajorAxis, params.semiMinorAxis, params.rotation);
      return createConicInfoFromGeneral(eq, {
        mode: "center-axes",
        type: "ellipse",
        center: params.center,
        semiMajorAxis: params.semiMajorAxis,
        semiMinorAxis: params.semiMinorAxis,
        rotation: params.rotation,
      });
    }
    case "general":
      return createConicInfoFromGeneral(params, { mode: "general" });
    case "three-points": {
      const result = circleFromThreePoints(params.pointA, params.pointB, params.pointC);
      if ("error" in result) {
        return {
          type: "degenerate",
          mode: "three-points",
          isValid: false,
          explanation: result.error,
          generalEquation: "",
        };
      }
      return createConicInfoFromGeneral(
        centerRadiusToGeneral(result.center, result.radius),
        { mode: "three-points", type: "circle", center: result.center, radius: result.radius }
      );
    }
    case "focus-point": {
      const eq = focusPointToParabola(params.focusPoint, params.directrixPoint, params.directrixNormal);
      return createConicInfoFromGeneral(eq, {
        mode: "focus-point",
        type: "parabola",
        focus: params.focusPoint,
        directrixPoint: params.directrixPoint,
        directrixNormal: params.directrixNormal,
      });
    }
    default:
      throw new Error(`Modo desconocido: ${mode}`);
  }
}

export default {
  classifyConic,
  focusDirectrixToGeneral,
  fociToGeneral,
  centerRadiusToGeneral,
  centerAxesToGeneral,
  focusPointToParabola,
  circleFromThreePoints,
  completeSquare,
  identifyConicFromMode,
};