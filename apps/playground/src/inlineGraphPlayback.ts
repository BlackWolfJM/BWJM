import type { TimelineNode } from "@mathmd/ast";
import { advanceTime, clampUnit, fractionTime, timeFraction } from "./timelineEngine.js";

/**
 * Only graphs with an actual animated scene get a playback control.
 * A static 3D surface or curve must never show a redundant timeline.
 */
export function supportsInlinePlayback(node: { type: string; animated?: boolean }): boolean {
  switch (node.type) {
    case "curve3d":
    case "surface3d":
      return node.animated === true;
    case "parametric2d":
      return node.animated !== false; // Old parametric documents were animated by default.
    case "trajectory":
    case "particle":
    case "frame":
    case "flow2d":
      return true;
    default:
      return false;
  }
}

export interface InlinePlaybackController {
  element: HTMLDivElement;
  dispose: () => void;
}

/**
 * One compact transport per document. The chart's existing layer toggles remain
 * the only place for Estela / Velocidad / Aceleración / Tangente / Normal.
 * This control only handles time, not duplicated graph presentation settings.
 */
export function createInlinePlayback(
  timelines: readonly TimelineNode[],
  readVariables: () => Record<string, number>,
  writeVariable: (name: string, value: number) => void,
): InlinePlaybackController {
  const timeline = timelines[0];
  if (!timeline) throw new Error("Inline playback requires a timeline");

  const element = document.createElement("div");
  element.className = "bwjm-inline-playback";
  element.setAttribute("role", "group");
  element.setAttribute("aria-label", "Reproducción de la gráfica");

  const play = document.createElement("button");
  play.type = "button";
  play.className = "bwjm-inline-playback-toggle";
  play.setAttribute("aria-label", "Reproducir animación");
  play.textContent = "▶ Reproducir";

  const seek = document.createElement("input");
  seek.type = "range";
  seek.className = "bwjm-inline-playback-seek";
  seek.min = "0";
  seek.max = "1";
  seek.step = "0.0001";
  seek.setAttribute("aria-label", "Instante de la gráfica");

  const time = document.createElement("output");
  time.className = "bwjm-inline-playback-value";
  time.setAttribute("aria-live", "off");

  element.append(play, seek, time);

  let playing = false;
  let disposed = false;
  let frameId: number | null = null;
  let previousFrame: number | null = null;

  const currentTime = (): number => {
    const value = readVariables()[timeline.name];
    return Number.isFinite(value) ? value : timeline.default ?? timeline.domain[0];
  };
  const updateDisplay = () => {
    const value = currentTime();
    seek.value = String(timeFraction(value, timeline.domain));
    time.textContent = timeline.name + " = " + Number(value.toFixed(3));
  };
  const setPlaying = (value: boolean) => {
    playing = value;
    play.textContent = value ? "Ⅱ Pausar" : "▶ Reproducir";
    play.setAttribute("aria-label", value ? "Pausar animación" : "Reproducir animación");
    play.setAttribute("aria-pressed", String(value));
    if (!value && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
      previousFrame = null;
    }
  };
  const synchronize = (fraction: number) => {
    timelines.forEach(item => writeVariable(item.name, fractionTime(fraction, item.domain)));
    updateDisplay();
  };
  const frame = (now: number) => {
    frameId = null;
    if (!playing || disposed || !element.isConnected) {
      setPlaying(false);
      return;
    }
    const elapsed = previousFrame === null ? 0 : Math.max(0, (now - previousFrame) / 1000);
    previousFrame = now;
    const next = advanceTime(currentTime(), elapsed, 1, timeline.domain, timeline.loop !== false);
    synchronize(timeFraction(next.time, timeline.domain));
    if (next.finished) { setPlaying(false); return; }
    frameId = requestAnimationFrame(frame);
  };
  play.onclick = () => {
    if (playing) { setPlaying(false); return; }
    setPlaying(true);
    previousFrame = null;
    frameId = requestAnimationFrame(frame);
  };
  seek.oninput = () => {
    setPlaying(false);
    synchronize(clampUnit(Number(seek.value)));
  };
  const onVariables = () => { if (!disposed && !playing) updateDisplay(); };
  window.addEventListener("bwjm-variable-change", onVariables);
  updateDisplay();

  return {
    element,
    dispose: () => {
      disposed = true;
      setPlaying(false);
      window.removeEventListener("bwjm-variable-change", onVariables);
      play.onclick = null;
      seek.oninput = null;
    },
  };
}
