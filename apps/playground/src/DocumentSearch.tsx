import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { IconSearch, IconX } from "./icons.js";

export interface TextMatch { start: number; end: number }
export function findTextMatches(text: string, query: string, maxMatches = 5000): TextMatch[] {
  if (!query.trim()) return [];
  const normalized = text.toLowerCase();
  const needle = query.toLowerCase();
  const matches: TextMatch[] = [];
  let cursor = 0;
  while (cursor < normalized.length && matches.length < maxMatches) {
    const found = normalized.indexOf(needle, cursor);
    if (found < 0) break;
    matches.push({ start: found, end: found + needle.length });
    cursor = found + Math.max(1, needle.length);
  }
  return matches;
}
interface Props {
  text: string;
  onLocate: (match: TextMatch) => void;
}
export const DocumentSearch = forwardRef<HTMLInputElement, Props>(function DocumentSearch({ text, onLocate }, inputRef) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(-1);
  const matches = useMemo(() => findTextMatches(text, query), [text, query]);
  useEffect(() => setCurrent(-1), [text, query]);
  const navigate = (direction: -1 | 1) => {
    if (!matches.length) return;
    const next = (current + direction + matches.length) % matches.length;
    setCurrent(next);
    onLocate(matches[next]);
  };
  return <div className="bwjm-document-search" role="search">
    <IconSearch size={16}/>
    <input ref={inputRef} value={query} type="search"
      aria-label="Buscar palabras en este documento" placeholder="Buscar en el documento (Ctrl+F)"
      onChange={event => setQuery(event.target.value)}
      onKeyDown={event => {
        if (event.key === "Enter") { event.preventDefault(); navigate(event.shiftKey ? -1 : 1); }
        if (event.key === "Escape") { setQuery(""); (event.target as HTMLInputElement).blur(); }
      }}/>
    {!!query && <span className="bwjm-search-count">{matches.length === 0 ? "0" :
      (current < 0 ? "0" : current + 1) + "/" + matches.length}</span>}
    {!!query && <>
      <button type="button" aria-label="Coincidencia anterior" disabled={!matches.length}
        title="Anterior (Mayús + Enter)" onClick={() => navigate(-1)}>↑</button>
      <button type="button" aria-label="Coincidencia siguiente" disabled={!matches.length}
        title="Siguiente (Enter)" onClick={() => navigate(1)}>↓</button>
      <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><IconX size={13}/></button>
    </>}
  </div>;
});
