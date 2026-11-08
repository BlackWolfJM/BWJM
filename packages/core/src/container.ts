export interface BWJMManifest {
  bwjmVersion: string;
  id: string;
  title: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  entrypoint: string;
  metadata?: Record<string, unknown>;
}

export interface BWJMStateSnapshot {
  id: string;
  name: string;
  parameters: Record<string, number>;
  timestamp: string;
}

export interface BWJMTestCase {
  id: string;
  description: string;
  assertions: Array<{
    type: "area" | "volume" | "intersection";
    expected: string | number;
    tolerance?: number;
  }>;
}

export interface BWJMPackage {
  manifest: BWJMManifest;
  document: string;
  states: Map<string, BWJMStateSnapshot>;
  tests: Map<string, BWJMTestCase>;
  assets: Map<string, Uint8Array | string>;
}

export function createDefaultManifest(id: string, title: string): BWJMManifest {
  const now = new Date().toISOString();
  return {
    bwjmVersion: "1.0.0",
    id,
    title,
    createdAt: now,
    updatedAt: now,
    entrypoint: "document.bwjm",
  };
}

export function createBWJMPackage(
  document: string,
  manifest?: Partial<BWJMManifest>,
): BWJMPackage {
  const baseManifest = createDefaultManifest(
    manifest?.id || "doc-" + Math.random().toString(36).slice(2, 9),
    manifest?.title || "Documento BWJM",
  );

  return {
    manifest: { ...baseManifest, ...manifest },
    document,
    states: new Map(),
    tests: new Map(),
    assets: new Map(),
  };
}

export function serializePackageToJSON(pkg: BWJMPackage): string {
  const serialized = {
    manifest: pkg.manifest,
    document: pkg.document,
    states: Object.fromEntries(pkg.states.entries()),
    tests: Object.fromEntries(pkg.tests.entries()),
  };
  return JSON.stringify(serialized, null, 2);
}

export function deserializePackageFromJSON(jsonStr: string): BWJMPackage {
  let parsed: {
    manifest?: BWJMManifest;
    document?: string;
    states?: Record<string, BWJMStateSnapshot>;
    tests?: Record<string, BWJMTestCase>;
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Error al deserializar paquete BWJM: ${msg}`);
  }

  if (!parsed.manifest || !parsed.document) {
    throw new Error("El paquete BWJM es inválido: faltan manifest o document.");
  }

  const pkg: BWJMPackage = {
    manifest: parsed.manifest,
    document: parsed.document,
    states: new Map(),
    tests: new Map(),
    assets: new Map(),
  };

  if (parsed.states) {
    for (const [key, state] of Object.entries(parsed.states)) {
      pkg.states.set(key, state);
    }
  }

  if (parsed.tests) {
    for (const [key, testCase] of Object.entries(parsed.tests)) {
      pkg.tests.set(key, testCase);
    }
  }

  return pkg;
}
