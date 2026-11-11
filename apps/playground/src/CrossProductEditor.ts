import type { CrossProductNode } from "@mathmd/ast";
import type { CrossProductNodeData } from "@mathmd/core";
import type { CrossProductDeterminant, CrossProductStudy, Vector3 } from "@mathmd/math";

/**
 * VIS-10: results stay in semantic HTML rather than floating over the 3D
 * geometry. Values come from the exact data object used by the Plotly scene.
 * showSteps is intentionally not a prerequisite for this summary.
 */
export interface CrossProductMetric {
  label: string;
  value: string;
  expression?: string;
}

/** Pure view model: uses already-computed core values, never recomputes geometry. */
export function summarizeCrossProductData(data: CrossProductNodeData): {
  metrics: CrossProductMetric[];
  notices: string[];
} {
  const metrics: CrossProductMetric[] = [];
  const notices: string[] = [];
  const format = (value: number): string =>
    Number.isFinite(value) ? String(Number(value.toPrecision(7))) : "No determinado";
  const add = (label: string, value: string, expression?: string) =>
    metrics.push({ label, value, ...(expression ? { expression } : {}) });

  if (data.crossScene.error !== undefined) {
    notices.push(data.crossScene.error);
    return { metrics, notices };
  }
  if (data.showArea !== false) {
    add("Área del paralelogramo", format(data.crossScene.area), "‖u × v‖");
    if (data.showTriangle === true) {
      add("Área del triángulo", format(data.crossScene.triangleArea), "½ ‖u × v‖");
    }
    if (!data.crossArea.isZero && !data.crossArea.isParallel) {
      add("Ángulo entre u y v", format(data.crossArea.thetaDeg) + "°", "θ");
    }
  }
  if (data.showVolume === true && data.w && data.volumeInfo) {
    add("Volumen firmado", format(data.volumeInfo.volumeSigned), "u · (v × w)");
    add("Volumen geométrico", format(data.volumeInfo.volumeAbsolute), "|u · (v × w)|");
  }
  if (data.showCollapse === true && data.collapseInfo) {
    add("Colapso", format(data.collapseInfo.factor * 100) + "%");
    if (data.collapseInfo.isCollapsed) notices.push(data.collapseInfo.explanation);
  }
  if (data.crossScene.warning) notices.push(data.crossScene.warning);
  return { metrics, notices };
}

export function createCrossProductSummary() {
  const element = document.createElement("section");
  element.className = "bwjm-cross-summary";
  element.setAttribute("aria-label", "Resumen del producto cruzado");
  const heading = document.createElement("h3");
  heading.textContent = "Resultados del producto cruz";
  const metrics = document.createElement("dl");
  metrics.className = "bwjm-cross-summary-grid";
  const messages = document.createElement("div");
  messages.className = "bwjm-cross-summary-messages";
  messages.setAttribute("aria-live", "polite");
  element.append(heading, metrics, messages);

  function update(data: CrossProductNodeData): void {
    metrics.replaceChildren();
    messages.replaceChildren();
    const summary = summarizeCrossProductData(data);
    for (const metric of summary.metrics) {
      const item = document.createElement("div");
      item.className = "bwjm-cross-summary-metric";
      const label = document.createElement("dt");
      label.textContent = metric.label;
      const result = document.createElement("dd");
      result.textContent = metric.value;
      if (metric.expression) {
        const formula = document.createElement("small");
        formula.textContent = metric.expression;
        result.appendChild(formula);
      }
      item.append(label, result);
      metrics.appendChild(item);
    }
    for (const warning of summary.notices) {
      const paragraph = document.createElement("p");
      paragraph.className = "bwjm-cross-summary-warning";
      paragraph.setAttribute("role", "status");
      paragraph.textContent = warning;
      messages.appendChild(paragraph);
    }
    if (!summary.metrics.length && !summary.notices.length) {
      const hint = document.createElement("p");
      hint.className = "bwjm-cross-summary-empty";
      hint.textContent = "Activa Área, Volumen o Colapso para ver los resultados geométricos.";
      messages.appendChild(hint);
    }
  }

  return { element, update };
}

export function createCrossProductDeterminant() {
  const element = document.createElement("section");
  element.className = "bwjm-cross-determinant";
  element.setAttribute("aria-label", "Determinante del producto cruz");
  const table = document.createElement("table");
  table.className = "bwjm-determinant-matrix";
  const order = table.createCaption();
  order.className = "bwjm-determinant-order";
  const basis = table.createTHead().insertRow();
  basis.setAttribute("aria-label", "Base canónica");
  const axes = ["i", "j", "k"] as const;
  for (const axis of axes) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.dataset.axis = axis;
    cell.textContent = axis;
    basis.appendChild(cell);
  }
  const body = table.createTBody();
  const rows = [body.insertRow(), body.insertRow()];
  const cells = rows.map(row => axes.map(() => row.insertCell()));
  const values = document.createElement("output");
  values.className = "bwjm-determinant-values";
  values.setAttribute("aria-label", "Componentes firmadas");
  const error = document.createElement("p");
  error.className = "bwjm-determinant-error";
  error.setAttribute("role", "status");
  element.append(table, values, error);

  function update(determinant: CrossProductDeterminant) {
    order.textContent = determinant.operation;
    determinant.rows.forEach(({ name, vector }, row) => {
      rows[row].dataset.operand = name;
      rows[row].setAttribute("aria-label", "Vector " + name);
      cells[row].forEach((cell, column) => {
        cell.textContent = Number.isFinite(vector[column]) ? String(vector[column]) : "—";
      });
    });
    error.textContent = determinant.scene.error ?? "";
    error.hidden = determinant.scene.error === undefined;
    values.hidden = determinant.scene.normal === undefined;
    values.replaceChildren(...(determinant.scene.normal?.map((component, index) => {
      const axis = axes[index];
      const term = document.createElement("span");
      term.dataset.axis = axis;
      term.textContent = (component < 0 ? "−" : "+") + Math.abs(component) + " " + axis;
      return term;
    }) ?? []));
  }
  return { element, update };
}

export function createCrossProductReport(
  showSteps: boolean,
  open: boolean,
  onToggle: (open: boolean) => void,
  onToggleOrder?: () => void,
) {
  const element = document.createElement("section");
  element.className = "bwjm-calculus-report bwjm-cross-report";
  element.setAttribute("aria-label", "Calculadora de producto cruz");
  const result = document.createElement("strong");
  result.setAttribute("aria-live", "polite");
  const order = document.createElement("span");
  order.className = "bwjm-cross-order";
  const value = document.createElement("span");
  value.className = "bwjm-cross-result";
  result.append(order, " ", value);

  const orderIndicator = document.createElement("button");
  orderIndicator.type = "button";
  orderIndicator.className = "bwjm-order-indicator";
  orderIndicator.setAttribute("aria-label", "Alternar orden de operandos u × v versus v × u");
  orderIndicator.title = "Alternar orden de operandos (u × v ↔ v × u)";
  if (onToggleOrder) {
    orderIndicator.addEventListener("click", () => onToggleOrder());
  } else {
    orderIndicator.disabled = true;
  }

  const details = document.createElement("details");
  details.className = "bwjm-cross-steps";
  details.hidden = !showSteps;
  details.open = open;
  details.addEventListener("toggle", () => onToggle(details.open));
  const summary = document.createElement("summary");
  summary.textContent = "Ver procedimiento";
  const list = document.createElement("ol");
  const error = document.createElement("p");
  error.className = "bwjm-cross-error";
  error.hidden = true;
  details.append(summary, list);
  element.append(result, orderIndicator, error, details);

  function update(study: CrossProductStudy) {
    order.textContent = study.operation;
    value.textContent = study.resultText;
    orderIndicator.textContent = study.orientation.reversed
      ? "Orden activo: v × u (invertido) ⇄ u × v"
      : "Orden activo: u × v (directo) ⇄ v × u";
    orderIndicator.dataset.reversed = String(study.orientation.reversed);
    orderIndicator.dataset.degenerate = String(study.orientation.isDegenerate);
    error.hidden = study.scene.error === undefined;
    error.textContent = study.scene.error ?? "";
    element.classList.toggle("has-error", !error.hidden);
    list.replaceChildren(...study.steps.map(step => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = step.title;
      const expression = document.createElement("div");
      expression.textContent = step.expression;
      const explanation = document.createElement("p");
      explanation.textContent = step.explanation;
      item.append(title, expression, explanation);

      if (step.orientation) {
        const orientationCard = document.createElement("div");
        orientationCard.className = "bwjm-cross-orientation-card";
        orientationCard.dataset.reversed = String(step.orientation.reversed);
        orientationCard.dataset.degenerate = String(step.orientation.isDegenerate);

        const cardHeader = document.createElement("header");
        cardHeader.className = "bwjm-orientation-header";
        cardHeader.textContent = `Regla de la mano derecha · Triedro ${step.orientation.order}`;

        const detailsGrid = document.createElement("div");
        detailsGrid.className = "bwjm-orientation-details";

        const antilaw = document.createElement("div");
        antilaw.className = "bwjm-orientation-property";
        const antilawLabel = document.createElement("span");
        antilawLabel.className = "bwjm-property-label";
        antilawLabel.textContent = "Propiedad anticonmutativa:";
        const antilawVal = document.createElement("code");
        antilawVal.className = "bwjm-property-value";
        antilawVal.textContent = `${step.orientation.anticommutativeIdentity}  ⇒  ${step.orientation.anticommutativeValues}`;
        antilaw.append(antilawLabel, " ", antilawVal);

        const detRow = document.createElement("div");
        detRow.className = "bwjm-orientation-property";
        const detLabel = document.createElement("span");
        detLabel.className = "bwjm-property-label";
        detLabel.textContent = "Determinante de orientación (producto triple):";
        const detVal = document.createElement("code");
        detVal.className = "bwjm-property-value";
        detVal.textContent = step.orientation.isDegenerate
          ? "det(u, v, n) = 0 (linealmente dependiente)"
          : `det(${step.orientation.order.replace(" × ", ", ")}, n) = ${step.orientation.tripleProductDeterminant} > 0 (${step.orientation.handedness})`;
        detRow.append(detLabel, " ", detVal);

        const curlRow = document.createElement("div");
        curlRow.className = "bwjm-orientation-property";
        const curlLabel = document.createElement("span");
        curlLabel.className = "bwjm-property-label";
        curlLabel.textContent = "Sentido de giro:";
        const curlVal = document.createElement("span");
        curlVal.className = "bwjm-property-value";
        curlVal.textContent = step.orientation.curlDescription;
        curlRow.append(curlLabel, " ", curlVal);

        const thumbRow = document.createElement("div");
        thumbRow.className = "bwjm-orientation-property";
        const thumbLabel = document.createElement("span");
        thumbLabel.className = "bwjm-property-label";
        thumbLabel.textContent = "Dirección del pulgar:";
        const thumbVal = document.createElement("span");
        thumbVal.className = "bwjm-property-value";
        thumbVal.textContent = step.orientation.thumbDescription;
        thumbRow.append(thumbLabel, " ", thumbVal);

        detailsGrid.append(antilaw, detRow, curlRow, thumbRow);
        orientationCard.append(cardHeader, detailsGrid);
        item.appendChild(orientationCard);
      }

      if (step.area) {
        const areaCard = document.createElement("div");
        areaCard.className = "bwjm-cross-area-card";
        areaCard.dataset.parallel = String(step.area.isParallel);
        areaCard.dataset.zero = String(step.area.isZero);

        const cardHeader = document.createElement("header");
        cardHeader.className = "bwjm-area-header";
        cardHeader.textContent = `Medidor de módulo y área: ‖${study.operation}‖ = ‖u‖·‖v‖·sen(θ)`;

        const detailsGrid = document.createElement("div");
        detailsGrid.className = "bwjm-area-details";

        const formulaRow = document.createElement("div");
        formulaRow.className = "bwjm-area-property";
        const formulaLabel = document.createElement("span");
        formulaLabel.className = "bwjm-property-label";
        formulaLabel.textContent = "Área paralelogramo:";
        const formulaVal = document.createElement("code");
        formulaVal.className = "bwjm-property-value";
        formulaVal.textContent = step.area.formula;
        formulaRow.append(formulaLabel, " ", formulaVal);

        const triRow = document.createElement("div");
        triRow.className = "bwjm-area-property";
        const triLabel = document.createElement("span");
        triLabel.className = "bwjm-property-label";
        triLabel.textContent = "Área triángulo (1/2 ‖u×v‖):";
        const triVal = document.createElement("code");
        triVal.className = "bwjm-property-value";
        triVal.textContent = step.area.triangleFormula;
        triRow.append(triLabel, " ", triVal);

        const angleRow = document.createElement("div");
        angleRow.className = "bwjm-area-property";
        const angleLabel = document.createElement("span");
        angleLabel.className = "bwjm-property-label";
        angleLabel.textContent = "Ángulo entre vectores (θ):";
        const angleVal = document.createElement("span");
        angleVal.className = "bwjm-property-value";
        angleVal.textContent = step.area.isZero
          ? "Indefinido (al menos un vector es nulo)"
          : `${step.area.thetaDeg.toFixed(2)}° (cos θ = ${step.area.cosTheta.toFixed(4)}, sen θ = ${step.area.sinTheta.toFixed(4)})`;
        angleRow.append(angleLabel, " ", angleVal);

        const statusRow = document.createElement("div");
        statusRow.className = "bwjm-area-property";
        const statusLabel = document.createElement("span");
        statusLabel.className = "bwjm-property-label";
        statusLabel.textContent = "Estado geométrico:";
        const statusVal = document.createElement("span");
        statusVal.className = "bwjm-property-value";
        const formatArea = (value: number) => value > 0 && value < 1e-4
          ? String(Number(value.toPrecision(5))) : value.toFixed(4);
        statusVal.textContent = step.area.isZero
          ? "Vector nulo (protección contra división por cero activa)"
          : step.area.isParallel
          ? "Vectores colineales / paralelos (área nula: sen θ = 0)"
          : `Paralelogramo = ${formatArea(step.area.area)} | Triángulo = ${formatArea(step.area.triangleArea)} (exactamente la mitad)`;
        statusRow.append(statusLabel, " ", statusVal);

        detailsGrid.append(formulaRow, triRow, angleRow, statusRow);
        areaCard.append(cardHeader, detailsGrid);
        if (step.area.exact) {
          const exact = step.area.exact;
          const exactGroup = document.createElement("section");
          exactGroup.className = "bwjm-area-details bwjm-cross-area-exact";
          exactGroup.setAttribute("aria-label", "Cálculo exacto por producto cruz");
          const entries = [
            ["substitution", "Suma de cuadrados de la normal", exact.substitution],
            ["parallelogram", "Área exacta del paralelogramo (‖n‖ = √N)", exact.parallelogram],
            ["triangle", "Área exacta del triángulo (√N/2)", exact.triangle],
            ["check", "Comprobación del factor un medio", exact.check],
            ["translation", "Invariancia ante la traslación", exact.translation],
          ];
          for (const [key, label, text] of entries) {
            const row = document.createElement("div");
            row.className = "bwjm-area-property";
            const name = document.createElement("span");
            name.className = "bwjm-property-label";
            name.textContent = label;
            const value = document.createElement("code");
            value.className = "bwjm-property-value";
            value.dataset.exactArea = key;
            value.textContent = text;
            row.append(name, " ", value);
            exactGroup.appendChild(row);
          }
          areaCard.appendChild(exactGroup);
        }
        item.appendChild(areaCard);
      }

      if (step.perpendicularity) {
        const perpCard = document.createElement("div");
        perpCard.className = "bwjm-cross-perpendicular-card";
        perpCard.dataset.perpendicular = String(step.perpendicularity.isPerpendicular);
        perpCard.dataset.collinear = String(step.perpendicularity.isCollinear);

        const cardHeader = document.createElement("header");
        cardHeader.className = "bwjm-perp-header";
        cardHeader.textContent = "Verificación algebraica de perpendicularidad y ortogonalidad";

        const detailsGrid = document.createElement("div");
        detailsGrid.className = "bwjm-perp-details";

        const dotURow = document.createElement("div");
        dotURow.className = "bwjm-perp-property";
        const dotULabel = document.createElement("span");
        dotULabel.className = "bwjm-property-label";
        dotULabel.textContent = "Producto escalar u · n:";
        const dotUVal = document.createElement("code");
        dotUVal.className = "bwjm-property-value";
        dotUVal.textContent = step.perpendicularity.dotUExpr;
        dotURow.append(dotULabel, " ", dotUVal);

        const dotVRow = document.createElement("div");
        dotVRow.className = "bwjm-perp-property";
        const dotVLabel = document.createElement("span");
        dotVLabel.className = "bwjm-property-label";
        dotVLabel.textContent = "Producto escalar v · n:";
        const dotVVal = document.createElement("code");
        dotVVal.className = "bwjm-property-value";
        dotVVal.textContent = step.perpendicularity.dotVExpr;
        dotVRow.append(dotVLabel, " ", dotVVal);

        const statusRow = document.createElement("div");
        statusRow.className = "bwjm-perp-property";
        const statusLabel = document.createElement("span");
        statusLabel.className = "bwjm-property-label";
        statusLabel.textContent = "Conclusión geométrica:";
        const statusVal = document.createElement("span");
        statusVal.className = "bwjm-property-value";
        statusVal.textContent = step.perpendicularity.explanation;
        statusRow.append(statusLabel, " ", statusVal);

        detailsGrid.append(dotURow, dotVRow, statusRow);
        perpCard.append(cardHeader, detailsGrid);
        item.appendChild(perpCard);
      }

      if (step.anticommutative) {
        const propCard = document.createElement("div");
        propCard.className = "bwjm-cross-properties-card";
        propCard.setAttribute("aria-label", "Propiedades algebraicas del producto cruz");

        const cardHeader = document.createElement("header");
        cardHeader.className = "bwjm-properties-header";
        cardHeader.textContent = "Propiedades: Anticonmutatividad y Distributividad";

        const detailsGrid = document.createElement("div");
        detailsGrid.className = "bwjm-properties-details";

        const antiRow = document.createElement("div");
        antiRow.className = "bwjm-prop-property";
        const antiLabel = document.createElement("span");
        antiLabel.className = "bwjm-property-label";
        antiLabel.textContent = "Anticonmutatividad:";
        const antiVal = document.createElement("code");
        antiVal.className = "bwjm-property-value";
        antiVal.textContent = `${step.anticommutative.reverseOperation} = −(${step.anticommutative.directOperation})`;
        antiRow.append(antiLabel, " ", antiVal);
        detailsGrid.appendChild(antiRow);

        if (step.distributive) {
          const distRow = document.createElement("div");
          distRow.className = "bwjm-prop-property";
          const distLabel = document.createElement("span");
          distLabel.className = "bwjm-property-label";
          distLabel.textContent = "Distributividad sobre la suma:";
          const distVal = document.createElement("code");
          distVal.className = "bwjm-property-value";
          distVal.textContent = `${step.distributive.expressionLeft} = ${step.distributive.expressionRight}`;
          distRow.append(distLabel, " ", distVal);
          detailsGrid.appendChild(distRow);
        }

        const expRow = document.createElement("div");
        expRow.className = "bwjm-prop-property";
        const expLabel = document.createElement("span");
        expLabel.className = "bwjm-property-label";
        expLabel.textContent = "Fundamento:";
        const expVal = document.createElement("span");
        expVal.className = "bwjm-property-value";
        expVal.textContent = step.anticommutative.explanation;
        expRow.append(expLabel, " ", expVal);
        detailsGrid.appendChild(expRow);

        propCard.append(cardHeader, detailsGrid);
        item.appendChild(propCard);
      }

      if (step.identities) {
        const identitiesCard = document.createElement("div");
        identitiesCard.className = "bwjm-cross-identities-card";
        identitiesCard.setAttribute("aria-label", "Inspector de identidades algebraicas y pruebas guiadas");

        const cardHeader = document.createElement("header");
        cardHeader.className = "bwjm-identities-header";
        cardHeader.textContent = "Inspector de identidades fundamentales del producto cruz";

        const identitiesList = document.createElement("div");
        identitiesList.className = "bwjm-identities-grid";

        for (const identity of step.identities.identities) {
          const idItem = document.createElement("div");
          idItem.className = "bwjm-identity-item";
          idItem.dataset.identityId = identity.id;
          idItem.dataset.match = String(identity.isExactMatch);

          const idTitle = document.createElement("strong");
          idTitle.className = "bwjm-identity-name";
          idTitle.textContent = identity.name;

          const formulaCode = document.createElement("code");
          formulaCode.className = "bwjm-identity-formula";
          formulaCode.textContent = `${identity.leftExpression} = ${identity.rightExpression}`;

          const evalRow = document.createElement("div");
          evalRow.className = "bwjm-identity-eval";
          const leftText = "(" + identity.leftEvaluated.join(", ") + ")";
          const rightText = "(" + identity.rightEvaluated.join(", ") + ")";
          evalRow.textContent = `Evaluación: ${identity.leftExpression} = ${leftText} ⇄ ${identity.rightExpression} = ${rightText}`;

          const warnRow = document.createElement("p");
          warnRow.className = "bwjm-identity-scalar-warning";
          warnRow.textContent = identity.scalarDotWarning;

          const stepsDetails = document.createElement("details");
          stepsDetails.className = "bwjm-identity-steps";
          const stepsSummary = document.createElement("summary");
          stepsSummary.textContent = "Ver demostración guiada paso a paso";
          const stepsOl = document.createElement("ol");
          for (const s of identity.steps) {
            const stepLi = document.createElement("li");
            const st = document.createElement("strong");
            st.textContent = s.title;
            const se = document.createElement("code");
            se.textContent = s.expression;
            const sp = document.createElement("p");
            sp.textContent = s.explanation;
            stepLi.append(st, " ", se, sp);
            stepsOl.appendChild(stepLi);
          }
          stepsDetails.append(stepsSummary, stepsOl);

          idItem.append(idTitle, formulaCode, evalRow, warnRow, stepsDetails);
          identitiesList.appendChild(idItem);
        }

        identitiesCard.append(cardHeader, identitiesList);
        item.appendChild(identitiesCard);
      }

      if (step.cofactors && step.cofactors.length > 0) {
        const cofactorsList = document.createElement("div");
        cofactorsList.className = "bwjm-cross-cofactors";
        cofactorsList.setAttribute("aria-label", "Desarrollo por menores y cofactores");
        for (const cofactor of step.cofactors) {
          const card = document.createElement("div");
          card.className = "bwjm-cross-cofactor-card";
          card.dataset.axis = cofactor.axis;

          const header = document.createElement("header");
          header.className = "bwjm-cofactor-header";
          const signSymbol = cofactor.sign === 1 ? "+" : "−";
          header.textContent = `Menor y cofactor de ${cofactor.axis} (signo: ${signSymbol})`;

          const matrix = document.createElement("table");
          matrix.className = "bwjm-minor-matrix";
          matrix.setAttribute("aria-label", `Menor 2×2 para ${cofactor.axis}`);
          const tbody = matrix.createTBody();
          for (const rowVals of cofactor.rows) {
            const tr = tbody.insertRow();
            for (const val of rowVals) {
              const td = tr.insertCell();
              td.textContent = Number.isFinite(val) ? String(val) : "—";
            }
          }

          const formula = document.createElement("div");
          formula.className = "bwjm-cofactor-formula";
          const diffPart = cofactor.difference ? ` = ${cofactor.difference}` : "";
          const minorPart = ` = ${cofactor.minorRelation} ${cofactor.sign === -1 ? `−(${cofactor.minor})` : cofactor.minor}`;
          const coeffPart = ` = ${cofactor.coefficientRelation} ${cofactor.coefficient} ${cofactor.axis}`;
          formula.textContent = `${cofactor.substitution}${diffPart}${minorPart}${coeffPart}`;

          card.append(header, matrix, formula);
          cofactorsList.appendChild(card);
        }
        item.appendChild(cofactorsList);
      }
      return item;
    }));
  }
  return { element, update };
}

type VectorKey = "u" | "v";
type Axis = 0 | 1 | 2;
const axesByPlane = { xy: [0, 1], xz: [0, 2], yz: [1, 2] } as const;
const axisNames = ["x", "y", "z"] as const;
const vectorKeys = ["u", "v"] as const;
const center = 120;
const plotRadius = 100;

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

export function createCrossProductEditor(
  node: CrossProductNode,
  handlers: {
    preview(u: Vector3, v: Vector3): void;
    save(key: VectorKey | "w", vector: Vector3): void;
  },
): HTMLElement {
  const editor = document.createElement("section");
  editor.className = "bwjm-cross-editor";
  const plane = document.createElement("select");
  plane.setAttribute("aria-label", "Plano de edición");
  for (const value of Object.keys(axesByPlane)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value.toUpperCase();
    plane.appendChild(option);
  }
  const planeLabel = document.createElement("label");
  planeLabel.append("Plano de edición ", plane);
  const front = document.createElement("select");
  front.setAttribute("aria-label", "Extremo al frente");
  for (const key of vectorKeys) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    front.appendChild(option);
  }
  front.value = "v";
  const frontLabel = document.createElement("label");
  frontLabel.append("Extremo al frente ", front);
  const hint = document.createElement("p");
  hint.textContent = "Arrastra un extremo en la proyección o edita sus coordenadas. La tercera coordenada se conserva al arrastrar.";

  const projection = svgElement("svg");
  projection.setAttribute("viewBox", "0 0 240 240");
  projection.setAttribute("aria-hidden", "true");
  projection.dataset.crossProjection = "";

  const horizontal = svgElement("line");
  const vertical = svgElement("line");
  for (const [axis, x1, y1, x2, y2] of [
    [horizontal, 12, center, 228, center],
    [vertical, center, 12, center, 228],
  ] as const) {
    axis.setAttribute("x1", String(x1));
    axis.setAttribute("y1", String(y1));
    axis.setAttribute("x2", String(x2));
    axis.setAttribute("y2", String(y2));
    axis.setAttribute("stroke", "currentColor");
    axis.setAttribute("stroke-opacity", "0.4");
  }
  const horizontalLabel = svgElement("text");
  horizontalLabel.setAttribute("x", "225");
  horizontalLabel.setAttribute("y", "115");
  const verticalLabel = svgElement("text");
  verticalLabel.setAttribute("x", "125");
  verticalLabel.setAttribute("y", "18");
  for (const label of [horizontalLabel, verticalLabel]) label.setAttribute("fill", "currentColor");
  projection.append(horizontal, vertical, horizontalLabel, verticalLabel);
  editor.append(planeLabel, frontLabel, hint, projection);

  const vectors: Record<VectorKey, Vector3> = { u: [...node.u], v: [...node.v] };
  const inputs: Record<VectorKey, HTMLInputElement[]> = { u: [], v: [] };
  const traces = { u: svgElement("line"), v: svgElement("line") };
  const handles = { u: svgElement("circle"), v: svgElement("circle") };
  let drag: { key: VectorKey; pointerId: number; original: Vector3; scale: number; start: DOMPoint } | undefined;
  let previewFrame: number | undefined;

  function requestPreview() {
    if (previewFrame !== undefined) return;
    previewFrame = requestAnimationFrame(() => {
      previewFrame = undefined;
      if (editor.isConnected) handlers.preview(vectors.u, vectors.v);
    });
  }

  function selectedAxes() {
    return axesByPlane[plane.value as keyof typeof axesByPlane];
  }

  function projectionScale(a: Axis, b: Axis) {
    const extent = Math.max(2, Math.abs(vectors.u[a]), Math.abs(vectors.u[b]),
      Math.abs(vectors.v[a]), Math.abs(vectors.v[b]));
    return Math.min(Number.MAX_VALUE, extent * 1.25);
  }

  function draw() {
    const [a, b] = selectedAxes();
    const scale = drag?.scale ?? projectionScale(a, b);
    horizontalLabel.textContent = axisNames[a];
    verticalLabel.textContent = axisNames[b];
    for (const key of vectorKeys) {
      const x = center + vectors[key][a] / scale * plotRadius;
      const y = center - vectors[key][b] / scale * plotRadius;
      traces[key].setAttribute("x2", String(x));
      traces[key].setAttribute("y2", String(y));
      handles[key].setAttribute("cx", String(x));
      handles[key].setAttribute("cy", String(y));
    }
  }

  function updateInputs(key: VectorKey) {
    inputs[key].forEach((input, index) => { input.value = String(vectors[key][index]); });
  }

  function pointerPosition(event: PointerEvent): DOMPoint | undefined {
    const transform = projection.getScreenCTM();
    if (!transform) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    return Number.isFinite(point.x) && Number.isFinite(point.y) ? point : undefined;
  }

  const components = document.createElement("div");
  components.className = "bwjm-cross-components";
  for (const key of vectorKeys) {
    const color = key === "u" ? "#0284c7" : "#ea580c";
    const trace = traces[key];
    trace.setAttribute("x1", String(center));
    trace.setAttribute("y1", String(center));
    trace.setAttribute("stroke", color);
    trace.setAttribute("stroke-width", "3");
    projection.appendChild(trace);
    const handle = handles[key];
    handle.dataset.crossHandle = key;
    handle.setAttribute("r", "9");
    handle.setAttribute("fill", color);
    handle.setAttribute("stroke", "currentColor");
    handle.addEventListener("pointerdown", event => {
      if (drag || event.button !== 0) return;
      const start = pointerPosition(event);
      if (!start) return;
      const [a, b] = selectedAxes();
      drag = { key, pointerId: event.pointerId, original: [...vectors[key]], scale: projectionScale(a, b), start };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    const fields = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = key === "u" ? (node.labelU ?? "u") : (node.labelV ?? "v");
    fields.appendChild(legend);
    axisNames.forEach((name, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.setAttribute("aria-label", key + " " + name);
      input.value = String(vectors[key][index]);
      input.addEventListener("input", () => {
        if (!Number.isFinite(input.valueAsNumber)) return;
        vectors[key][index] = input.valueAsNumber;
        draw();
        requestPreview();
      });
      input.addEventListener("change", () => {
        if (Number.isFinite(input.valueAsNumber)) {
          vectors[key][index] = input.valueAsNumber;
          handlers.save(key, vectors[key]);
        }
      });
      input.addEventListener("blur", () => {
        if (Number.isFinite(input.valueAsNumber)) return;
        vectors[key][index] = node[key][index];
        input.value = String(node[key][index]);
        draw();
        requestPreview();
      });
      label.append(name, input);
      fields.appendChild(label);
      inputs[key].push(input);
    });
    components.appendChild(fields);
  }
  if (node.showDistributive || node.w) {
    const vecW: Vector3 = [...(node.w ?? [0, 1, 1])];
    const fieldsW = document.createElement("fieldset");
    const legendW = document.createElement("legend");
    legendW.textContent = node.labelW ?? "w (distributividad)";
    fieldsW.appendChild(legendW);
    axisNames.forEach((name, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.setAttribute("aria-label", "w " + name);
      input.value = String(vecW[index]);
      input.addEventListener("input", () => {
        if (!Number.isFinite(input.valueAsNumber)) return;
        vecW[index] = input.valueAsNumber;
        requestPreview();
      });
      input.addEventListener("change", () => {
        if (Number.isFinite(input.valueAsNumber)) {
          vecW[index] = input.valueAsNumber;
          handlers.save("w", vecW);
        }
      });
      label.append(name, input);
      fieldsW.appendChild(label);
    });
    components.appendChild(fieldsW);
  }
  projection.append(handles.u, handles.v);
  editor.appendChild(components);

  plane.addEventListener("change", draw);
  front.addEventListener("change", () => {
    projection.appendChild(front.value === "u" ? handles.u : handles.v);
  });
  projection.addEventListener("pointermove", event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointerPosition(event);
    if (!point) return;
    const [a, b] = selectedAxes();
    const limit = (fraction: number) => Math.max(-1, Math.min(1, fraction));
    const round = (value: number) => {
      const rounded = Number(value.toPrecision(7));
      return Number.isFinite(rounded) ? rounded : value;
    };
    vectors[drag.key][a] = round(limit(drag.original[a] / drag.scale +
      (point.x - drag.start.x) / plotRadius) * drag.scale);
    vectors[drag.key][b] = round(limit(drag.original[b] / drag.scale -
      (point.y - drag.start.y) / plotRadius) * drag.scale);
    draw();
    updateInputs(drag.key);
    requestPreview();
  });
  function finishDrag(event: PointerEvent, commit: boolean) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const { key, original } = drag;
    drag = undefined;
    if (commit) {
      if (vectors[key].some((value, index) => value !== original[index])) {
        handlers.save(key, vectors[key]);
      }
    } else {
      vectors[key] = original;
      updateInputs(key);
      requestPreview();
    }
    draw();
  }
  projection.addEventListener("pointerup", event => finishDrag(event, true));
  projection.addEventListener("pointercancel", event => finishDrag(event, false));
  projection.addEventListener("lostpointercapture", event => finishDrag(event, false));
  draw();
  return editor;
}
