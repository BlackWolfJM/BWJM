import { describe, expect, it } from "vitest";
import {
  computeCrossSection,
  computeRevolutionVolume,
  sampleRevolutionMesh,
} from "../src/solidRevolution.js";

describe("Sólidos de Revolución 3D (Especificación BWJM Sección 4)", () => {
  it("calcula el volumen exacto de la región f(x)=x, g(x)=x^2 girando sobre el eje x dando 2*pi/15", () => {
    const result = computeRevolutionVolume("x", "x^2", [0, 1], "x");

    // V = pi * (1/3 - 1/5) = 2*pi/15 ≈ 0.41887902
    expect(result.exactFractionOfPi).toBe("2/15");
    expect(result.volume).toBeCloseTo((2 * Math.PI) / 15, 4);
  });

  it("mantiene el volumen geométrico constante para giros de 2*pi y 3*pi (regla geométrica Sección 4)", () => {
    const volAt2Pi = computeRevolutionVolume("x", "x^2", [0, 1], "x", 2 * Math.PI);
    const volAt3Pi = computeRevolutionVolume("x", "x^2", [0, 1], "x", 3 * Math.PI);

    // El volumen del conjunto de puntos alcanzados en el espacio tridimensional no varía tras 2*pi
    expect(volAt3Pi.volume).toBeCloseTo(volAt2Pi.volume, 5);
    expect(volAt3Pi.effectiveAngularCoverage).toBeCloseTo(2 * Math.PI, 4);
    expect(volAt3Pi.angularSweepTraveled).toBeCloseTo(3 * Math.PI, 4);
  });

  it("calcula el corte transversal (arandela) en un punto x dado", () => {
    // Para x = 0.5: f(0.5) = 0.5, g(0.5) = 0.25
    // Radio exterior R = 0.5, radio interior r = 0.25
    // Área de la arandela = pi * (0.5^2 - 0.25^2) = pi * (0.25 - 0.0625) = pi * 0.1875
    const slice = computeCrossSection("x", "x^2", 0.5);

    expect(slice.outerRadius).toBeCloseTo(0.5, 4);
    expect(slice.innerRadius).toBeCloseTo(0.25, 4);
    expect(slice.washerArea).toBeCloseTo(Math.PI * 0.1875, 4);
  });

  it("genera la malla 3D de barrido para visualización en WebGL", () => {
    const mesh = sampleRevolutionMesh("x", "x^2", [0, 1], Math.PI, "x", 15, 15);

    expect(mesh.x.length).toBe(15);
    expect(mesh.y.length).toBe(15);
    expect(mesh.z.length).toBe(15);
    expect(mesh.sweepAngle).toBeCloseTo(Math.PI, 4);
  });
});

