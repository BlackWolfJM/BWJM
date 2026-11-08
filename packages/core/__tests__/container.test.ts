import { describe, expect, it } from "vitest";
import {
  createBWJMPackage,
  createDefaultManifest,
  deserializePackageFromJSON,
  serializePackageToJSON,
} from "../src/container.js";

describe("Contenedor y Paquete BWJM (.bwjmz)", () => {
  it("crea un manifiesto con version 1.0.0 y punto de entrada por defecto", () => {
    const manifest = createDefaultManifest("doc-1", "Leccion de Prueba");
    expect(manifest.bwjmVersion).toBe("1.0.0");
    expect(manifest.id).toBe("doc-1");
    expect(manifest.title).toBe("Leccion de Prueba");
    expect(manifest.entrypoint).toBe("document.bwjm");
  });

  it("empaqueta, serializa y deserializa un documento con estados y pruebas", () => {
    const docSource = "# Titulo\n\n```slider\nname: a\ndefault: 1\n```\n";
    const pkg = createBWJMPackage(docSource, { title: "Prueba Serializacion" });

    pkg.states.set("state-1", {
      id: "state-1",
      name: "Parametro A en 2",
      parameters: { a: 2 },
      timestamp: new Date().toISOString(),
    });

    pkg.tests.set("test-1", {
      id: "test-1",
      description: "Verificar valor de area",
      assertions: [
        {
          type: "area",
          expected: "1/6",
        },
      ],
    });

    const json = serializePackageToJSON(pkg);
    const restored = deserializePackageFromJSON(json);

    expect(restored.manifest.title).toBe("Prueba Serializacion");
    expect(restored.document).toBe(docSource);
    expect(restored.states.get("state-1")?.parameters.a).toBe(2);
    expect(restored.tests.get("test-1")?.assertions[0].expected).toBe("1/6");
  });

  it("lanza error descriptivo si el formato json es invalido o faltan campos obligatorios", () => {
    expect(() => deserializePackageFromJSON("invalido")).toThrow();
    expect(() => deserializePackageFromJSON("{}")).toThrow();
  });
});

