import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineNode } from "@mathmd/ast";
import {
  addTimeMarker, advanceTime, clampUnit, fractionTime,
  sequenceFrames, timeFraction,
} from "./timelineEngine.js";

interface Props {
  timelines: TimelineNode[];
  getVariables: () => Record<string, number>;
  onVariableChange: (name: string, value: number) => void;
  onSaveSource: (transform: (source: string) => string) => void;
}

export function ScientificTimeline({
  timelines, getVariables, onVariableChange, onSaveSource,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reverse, setReverse] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const [segmentStart, setSegmentStart] = useState(0);
  const [segmentEnd, setSegmentEnd] = useState(1);
  const [note, setNote] = useState("");
  const [, setRevision] = useState(0);
  const first = timelines[0];

  // Keep callbacks and current document values fresh without restarting the animation.
  const varsRef = useRef(getVariables);
  const changeRef = useRef(onVariableChange);
  varsRef.current = getVariables;
  changeRef.current = onVariableChange;

  useEffect(() => {
    const refresh = () => setRevision(x => x + 1);
    window.addEventListener("bwjm-variable-change", refresh);
    return () => window.removeEventListener("bwjm-variable-change", refresh);
  }, []);

  const readCurrent = useCallback(() => {
    if (!first) return 0;
    const value = varsRef.current()[first.name];
    return Number.isFinite(value) ? value : first.default ?? first.domain[0];
  }, [first]);

  const setProgress = useCallback((progress: number) => {
    timelines.forEach(tl => {
      changeRef.current(tl.name, fractionTime(progress, tl.domain));
    });
  }, [timelines]);

  const current = readCurrent();
  const progress = first ? timeFraction(current, first.domain) : 0;

  useEffect(() => {
    if (!playing || !first) return;
    let frameId = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const bound: [number, number] = [
        fractionTime(segmentStart, first.domain),
        fractionTime(segmentEnd, first.domain),
      ];
      const result = advanceTime(readCurrent(), dt, speed, first.domain,
        repeat, reverse ? -1 : 1, bound);
      setProgress(timeFraction(result.time, first.domain));
      if (result.finished) { setPlaying(false); return; }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [playing, first, speed, repeat, reverse, segmentStart, segmentEnd, readCurrent, setProgress]);

  if (!first) return null;

  const singleFrame = (direction: -1 | 1) => {
    setPlaying(false);
    setProgress(clampUnit(progress + direction / 120));
  };
  const exportFrames = () => {
    const payload = {
      format: "bwjm-timeline-data-v1",
      description: "Fotogramas de datos reproducibles; no es un video ni una captura de imagen",
      speed, reverse, repeat, segment: [segmentStart, segmentEnd],
      frames: sequenceFrames(timelines, 121, [segmentStart, segmentEnd]),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)],
      { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bwjm-fotogramas-datos.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const saveMarker = () => {
    if (!note.trim() || (first.markers?.length ?? 0) >= 20) return;
    const name = first.name;
    const at = current;
    const label = note.trim();
    onSaveSource(source => addTimeMarker(source, name, { at, label }));
    setNote("");
  };

  return (
    <section className="bwjm-timeline-controller bwjm-science-clock"
      aria-label="Reloj científico global">
      <div className="bwjm-science-clock-top">
        <strong>Reloj científico</strong>
        <span className="bwjm-science-clock-value">{first.name} = {current.toFixed(3)}</span>
        <label>Velocidad
          <input aria-label="Velocidad de reproducción" type="range" min="0.1" max="8"
            step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
          {speed.toFixed(1)}×
        </label>
      </div>
      <input aria-label="Posición temporal" className="bwjm-science-scrub" type="range"
        min="0" max="1" step="0.0001" value={progress}
        onChange={e => setProgress(Number(e.target.value))} />
      <div className="bwjm-science-ticks">
        {[0, 0.25, 0.5, 0.75, 1].map(value =>
          <span key={value}>{fractionTime(value, first.domain).toFixed(2)}</span>)}
      </div>
      <div className="bwjm-science-actions">
        <button type="button" title="Restablecer al tiempo inicial"
          onClick={() => { setPlaying(false); setProgress(timeFraction(first.default ?? first.domain[0], first.domain)); }}>
          ⟲ Inicio
        </button>
        <button type="button" title="Retroceder un fotograma" onClick={() => singleFrame(-1)}>◀|</button>
        <button type="button" className={playing ? "active" : ""}
          onClick={() => setPlaying(v => !v)}>{playing ? "Ⅱ Pausar" : "▶ Reproducir"}</button>
        <button type="button" title="Avanzar un fotograma" onClick={() => singleFrame(1)}>|▶</button>
        <button type="button" aria-pressed={reverse} onClick={() => setReverse(v => !v)}>
          {reverse ? "↶ Inversa" : "↷ Adelante"}
        </button>
        <label><input type="checkbox" checked={repeat}
          onChange={e => setRepeat(e.target.checked)} /> Repetir</label>
        <button type="button" onClick={exportFrames}>↓ 121 fotogramas (JSON)</button>
      </div>
      <div className="bwjm-science-actions">
        <span>Tramo:</span>
        <button type="button" onClick={() => setSegmentStart(Math.min(progress, segmentEnd - 0.001))}>
          Marcar inicio
        </button>
        <button type="button" onClick={() => setSegmentEnd(Math.max(progress, segmentStart + 0.001))}>
          Marcar fin
        </button>
        <span>{fractionTime(segmentStart, first.domain).toFixed(2)} – {fractionTime(segmentEnd, first.domain).toFixed(2)}</span>
        <button type="button" onClick={() => { setSegmentStart(0); setSegmentEnd(1); }}>Intervalo completo</button>
      </div>
      <div className="bwjm-science-actions bwjm-science-markers">
        <input type="text" aria-label="Texto del marcador temporal" value={note} maxLength={80}
          placeholder="Anotación de este instante…" onChange={e => setNote(e.target.value)} />
        <button type="button" onClick={saveMarker} disabled={!note.trim() || (first.markers?.length ?? 0) >= 20}>
          + Guardar en archivo
        </button>
        {first.markers?.map((marker, index) =>
          <button type="button" key={index}
            title={"Ir al tiempo " + marker.at}
            onClick={() => setProgress(timeFraction(marker.at, first.domain))}>
            {marker.at.toFixed(2)} · {marker.label}
          </button>)}
      </div>
      <small>Variables sincronizadas: {timelines.map(item => item.name).join(", ")}</small>
    </section>
  );
}
