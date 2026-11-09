import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "./icons.js";
import { STUDIO_THEMES, STUDIO_THEME_GROUPS, type StudioThemeId } from "./studioThemes.js";

interface Props {
  theme: StudioThemeId;
  onThemeChange: (theme: StudioThemeId) => void;
}

/** Drop-down lives in a portal to avoid the ribbon's horizontal overflow clipping it. */
export const ThemePicker: React.FC<Props> = ({theme,onThemeChange}) => {
  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState("");
  const [position,setPosition] = useState({top:0,left:0});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = STUDIO_THEMES.find(item=>item.id===theme) ?? STUDIO_THEMES[0];

  const close = () => setOpen(false);
  const toggle = () => {
    if (!open && triggerRef.current) {
      const bounds = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: Math.min(bounds.bottom + 7,Math.max(8,window.innerHeight-200)),
        left: Math.max(8,Math.min(bounds.left,window.innerWidth-320)),
      });
    }
    setOpen(!open);
  };

  useEffect(()=>{
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const onScroll = (event: Event) => {
      // Closing avoids a stranded popup when the tab strip moves.
      if (!(event.target instanceof Node) || !popoverRef.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown",onOutside);
    document.addEventListener("keydown",onKey);
    window.addEventListener("resize",close);
    window.addEventListener("scroll",onScroll,true);
    return ()=>{
      document.removeEventListener("pointerdown",onOutside);
      document.removeEventListener("keydown",onKey);
      window.removeEventListener("resize",close);
      window.removeEventListener("scroll",onScroll,true);
    };
  },[open]);

  return <>
    <button ref={triggerRef} type="button" className="bwjm-theme-trigger"
      onClick={toggle} aria-expanded={open} aria-haspopup="dialog"
      aria-controls="bwjm-theme-options" title="Cambiar tema y previsualizar colores">
      <span className="bwjm-theme-trigger-colors" aria-hidden="true">
        {selected.colors.slice(0,3).map((color,index)=>
          <i key={index} style={{backgroundColor:color}} />)}
      </span>
      <span className="bwjm-theme-trigger-text">Cambiar tema</span>
      <IconChevronDown size={13}/>
    </button>
    {open && createPortal(
      <div ref={popoverRef} id="bwjm-theme-options" className={"bwjm-theme-popover theme-"+theme}
        style={{top:position.top,left:position.left}} role="dialog"
        aria-label="Elegir tema visual del editor">
        <div className="bwjm-theme-popover-heading">
          <strong>Tema de BWJM Studio</strong>
          <small>{STUDIO_THEMES.length} estilos · elige uno para compararlo inmediatamente.</small>
          <input type="search" className="bwjm-theme-search" value={query}
            onChange={event=>setQuery(event.target.value)} placeholder="Buscar tema o color…"
            aria-label="Filtrar temas por nombre o color hexadecimal" />
        </div>
        <div className="bwjm-theme-gallery" role="listbox" aria-label="Temas disponibles">
          {STUDIO_THEME_GROUPS.map(group=>{
            const results=STUDIO_THEMES.filter(item=>
              group.ids.some(id=>id===item.id) &&
              (item.name.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")) ||
               item.description.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")) ||
               item.colors.some(color=>color.toLowerCase().includes(query.trim().toLowerCase()))));
            return results.length ? <div key={group.id} className="bwjm-theme-category" role="group" aria-label={group.label}>
              <div className="bwjm-theme-category-heading">
                <strong>{group.label}</strong>
                <small>{results.length}</small>
              </div>
              {results.map(item=>
                <button key={item.id} type="button" role="option"
                  aria-selected={theme===item.id}
                  className={"bwjm-theme-option "+(theme===item.id?"selected":"")}
                  onClick={()=>onThemeChange(item.id)}
                  title={item.description}>
                  <span className="bwjm-theme-swatch-strip" aria-hidden="true">
                    {item.colors.map((color,index)=>
                      <i key={index} style={{backgroundColor:color}} />)}
                  </span>
                  <span className="bwjm-theme-option-caption">
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="bwjm-theme-option-check" aria-hidden="true">
                    {theme===item.id?"✓":""}
                  </span>
                </button>)}
            </div> : null;
          })}
          {!STUDIO_THEMES.some(item=>
             item.name.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")) ||
             item.description.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es")) ||
             item.colors.some(color=>color.toLowerCase().includes(query.trim().toLowerCase()))) &&
            <p className="bwjm-theme-empty">No hay temas que coincidan con tu búsqueda.</p>}
        </div>
        <div className="bwjm-theme-popover-footer">
          <span>El tema se recuerda al volver a abrir el editor.</span>
          <button type="button" onClick={close}>Cerrar</button>
        </div>
      </div>,document.body)}
  </>;
};
