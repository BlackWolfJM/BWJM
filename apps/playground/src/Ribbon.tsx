import React, { useState } from "react";
import { IconAtom, IconBarChart, IconBookOpen, IconChevronDown, IconCode,
  IconColumns, IconDownload, IconFileText, IconFolderOpen, IconFunction,
  IconLayers, IconList, IconSearch, IconSidebar, IconSliders } from "./icons.js";

export type RibbonTab = "Archivo" | "Inicio" | "Insertar" | "Matemáticas" | "Datos" | "Vista";
export type RibbonAction =
  | "open" | "save" | "export-html"
  | "h1" | "h2" | "h3" | "bold" | "italic" | "code" | "quote" | "list" | "rule"
  | "formula" | "graph" | "table" | "picture" | "plot2d" | "surface3d"
  | "equation" | "inline-math" | "matrix" | "integral" | "slider"
  | "data-table" | "vectorfield" | "riemann"
  | "view-editor" | "view-split" | "view-reader" | "outline" | "inspector"
  | "theme-linear" | "theme-catppuccin" | "theme-tokyonight" | "commands";
interface ActionSpec {
  id: RibbonAction;
  label: string;
  hint?: string;
  icon?: "file"|"folder"|"save"|"graph"|"formula"|"code"|"book"|"columns"|"layers"|"list"|"slider"|"search"|"sidebar"|"atom";
}
interface RibbonGroup { label: string; actions: readonly ActionSpec[] }
const item = (id: RibbonAction, label: string, icon?: ActionSpec["icon"], hint?: string): ActionSpec => ({id,label,icon,hint});
/** Single declarative registry. New scientific tools only add a command and one group entry. */
export const RIBBON_GROUPS: Record<RibbonTab, readonly RibbonGroup[]> = {
  Archivo: [{label:"Documento",actions:[
    item("open","Abrir","folder","Ctrl+O"),item("save","Guardar","save","Ctrl+S"),
    item("export-html","Exportar HTML","file")]}],
  Inicio: [
    {label:"Estilos",actions:[item("h1","Título 1"),item("h2","Título 2"),item("h3","Título 3")]},
    {label:"Formato",actions:[item("bold","Negrita"),item("italic","Cursiva"),
      item("code","Código","code"),item("quote","Cita"),item("list","Lista","list"),item("rule","Separador")]},
  ],
  Insertar: [
    {label:"Contenido",actions:[item("formula","Fórmula","formula","Ctrl+Mayús+M"),
      item("table","Tabla","list"),item("picture","Imagen","file")]},
    {label:"Gráficas",actions:[item("graph","Asistente de gráficas","graph"),
      item("plot2d","Gráfica 2D","graph"),item("surface3d","Superficie 3D","layers")]},
  ],
  Matemáticas: [
    {label:"Notación",actions:[item("equation","Ecuación","formula"),
      item("inline-math","Fórmula en línea","formula"),item("matrix","Matriz"),
      item("integral","Integral")]},
    {label:"Interactividad",actions:[item("slider","Parámetro","slider")]},
  ],
  Datos: [
    {label:"Datos y análisis",actions:[item("data-table","Tabla de datos","list"),
      item("vectorfield","Campo vectorial","graph"),item("riemann","Riemann","graph")]},
  ],
  Vista: [
    {label:"Modo de lectura",actions:[item("view-editor","Editor","code"),
      item("view-split","Dividido","columns"),item("view-reader","Lector","book")]},
    {label:"Paneles",actions:[item("outline","Esquema","sidebar"),item("inspector","Inspector","layers")]},
    {label:"Apariencia",actions:[item("theme-linear","Oscuro"),
      item("theme-catppuccin","Violeta"),item("theme-tokyonight","Azul")]},
    {label:"Herramientas",actions:[item("commands","Comandos","search","Ctrl+K")]},
  ],
};
const tabs = Object.keys(RIBBON_GROUPS) as RibbonTab[];
const icons = {
  file: IconFileText, folder: IconFolderOpen, save: IconDownload,
  graph: IconBarChart, formula: IconFunction, code: IconCode,
  book: IconBookOpen, columns: IconColumns, layers: IconLayers,
  list: IconList, slider: IconSliders, search: IconSearch,
  sidebar: IconSidebar, atom: IconAtom,
};
interface Props {
  onAction: (id: RibbonAction) => void;
  activeView: "editor" | "split" | "reader";
  onCollapseChange?: (collapsed: boolean) => void;
}
export const Ribbon: React.FC<Props> = ({onAction,activeView,onCollapseChange}) => {
  const [tab,setTab] = useState<RibbonTab>("Inicio");
  const [collapsed,setCollapsed] = useState(false);
  const toggle = () => {
    setCollapsed(old => {onCollapseChange?.(!old);return !old;});
  };
  return <section className={"bwjm-ribbon " + (collapsed ? "collapsed" : "")} aria-label="Cinta de herramientas BWJM">
    <div className="bwjm-ribbon-tabs">
      <div className="bwjm-ribbon-tablist" role="tablist" aria-label="Categorías de herramientas">
        {tabs.map(name=><button key={name} type="button" role="tab"
          aria-selected={tab===name} className={"bwjm-ribbon-tab " + (tab===name?"selected":"")}
          onClick={() => {setTab(name);setCollapsed(false);onCollapseChange?.(false);}}>{name}</button>)}
      </div>
      <button type="button" className="bwjm-ribbon-collapse" onClick={toggle}
        title={collapsed ? "Mostrar herramientas (Ctrl+F1)" : "Ocultar herramientas (Ctrl+F1)"}
        aria-expanded={!collapsed} aria-label={collapsed?"Desplegar cinta":"Contraer cinta"}>
        <IconChevronDown size={16}/>
        <span>{collapsed?"Mostrar":"Ocultar"}</span>
      </button>
    </div>
    {!collapsed && <div className="bwjm-ribbon-content" role="tabpanel" aria-label={"Herramientas de "+tab}>
      {RIBBON_GROUPS[tab].map(group=><div className="bwjm-ribbon-group" key={group.label}>
        <div className="bwjm-ribbon-buttons">
          {group.actions.map(action=>{
            const Icon = action.icon ? icons[action.icon] : null;
            const selected=action.id === "view-"+activeView;
            return <button key={action.id} type="button"
              className={"bwjm-ribbon-action " + (selected?"active":"")}
              title={action.hint? action.label+" · "+action.hint:action.label}
              onClick={()=>onAction(action.id)}>
              {Icon ? <Icon size={17}/> : <span className="bwjm-ribbon-glyph">{action.id==="bold"?"B":action.id==="italic"?"I":action.id.startsWith("h")?action.id.toUpperCase():"∑"}</span>}
              <span>{action.label}</span>
            </button>;
          })}
        </div>
        <span className="bwjm-ribbon-group-label">{group.label}</span>
      </div>)}
    </div>}
  </section>;
};
