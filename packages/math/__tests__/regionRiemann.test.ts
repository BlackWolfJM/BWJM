import { describe, expect, it } from "vitest";
import {
  computeExactArea,
  computeRiemannPartition,
  findIntersections,
} from "../src/regionRiemann.js";

describe("Cálculo de Área entre Curvas y Sumas de Riemann (Especificación BWJM)", () => {
  it("encuentra las intersecciones entre f(x)=x y g(x)=x^2 en el intervalo [0, 2]", () => {
    const intersections = findIntersections("x", "x^2", [0, 2]);

    expect(intersections.length).toBe(2);
    expect(intersections[0]?.x).toBeCloseTo(0, 3);
    expect(intersections[0]?.y).toBeCloseTo(0, 3);
    expect(intersections[1]?.x).toBeCloseTo(1, 3);
    expect(intersections[1]?.y).toBeCloseTo(1, 3);
  });

  it("calcula el área exacta entre f(x)=x y g(x)=x^2 en [0, 1] dando 1/6 (0.16667)", () => {
    const result = computeExactArea("x", "x^2", [0, 1]);

    // 1/6 = 0.16666666666666666
    expect(result.exactFraction).toBe("1/6");
    expect(result.value).toBeCloseTo(1 / 6, 4);
    expect(result.isBounded).toBe(true);
  });

  it("calcula las particiones de sumas de Riemann con n rectángulos", () => {
    const partition = computeRiemannPartition("x", "x^2", [0, 1], 10, "midpoint");

    expect(partition.rectangles.length).toBe(10);
    expect(partition.deltaX).toBeCloseTo(0.1, 4);
    // Para n=10 rectángulos con midpoint, la suma debe estar muy próxima a 1/6
    expect(partition.riemannSum).toBeCloseTo(1 / 6, 2);
    expect(partition.error).toBeLessThan(0.01);
  });

  it("adapta los cálculos dinámicamente cuando f(x) tiene un parámetro a (ej. a*x)", () => {
    // Si a = 2, f(x) = 2x, g(x) = x^2, intersección en x=0 y x=2
    const intersections = findIntersections("a * x", "x^2", [0, 3], { a: 2 });

    expect(intersections.length).toBe(2);
    expect(intersections[0]?.x).toBeCloseTo(0, 3);
    expect(intersections[1]?.x).toBeCloseTo(2, 3);
  });
});

