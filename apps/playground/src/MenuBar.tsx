import React, { useState, useEffect, useRef } from "react";
import { IconAtom, IconChevronDown } from "./icons.js";

interface MenuBarProps {
  filename: string;
  theme: "linear" | "catppuccin" | "tokyonight";
  onSetTheme: (theme: "linear" | "catppuccin" | "tokyonight") => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportHtml: () => void;
  onOpenFormulaModal: () => void;
  onOpenChartModal: () => void;
  onOpenCommandPalette: () => void;
  onInsertMarkdown: (prefix: string, suffix?: string) => void;
  onSetViewMode: (mode: "editor" | "split" | "reader") => void;
  onToggleSidebarLeft: () => void;
  onToggleSidebarRight: () => void;
  onShowHelp: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  filename,
  theme,
  onSetTheme,
  onNew,
  onOpen,
  onSave,
  onExportHtml,
  onOpenFormulaModal,
  onOpenChartModal,
  onOpenCommandPalette,
  onInsertMarkdown,
  onSetViewMode,
  onToggleSidebarLeft,
  onToggleSidebarRight,
  onShowHelp,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleAction = (callback: () => void) => {
    setActiveMenu(null);
    callback();
  };

  return (
    <div className="bwjm-menubar-root" ref={menuBarRef}>
      <div className="bwjm-menubar-brand">
        <div className="bwjm-logo-badge">
          <IconAtom size={15} />
          <span>BWJM</span>
        </div>
        <span className="bwjm-brand-name">BWJM Studio</span>
        <span className="bwjm-filename-tag">{filename}</span>
      </div>

      <div className="bwjm-menubar-nav">
        <div className="bwjm-menu-item-wrap">
          <button
            className={`bwjm-menu-btn ${activeMenu === "archivo" ? "active" : ""}`}
            onClick={() => handleMenuClick("archivo")}
          >
            <span>Archivo</span>
            <IconChevronDown size={11} />
          </button>
          {activeMenu === "archivo" && (
            <div className="bwjm-dropdown-menu">
              <button className="bwjm-dropdown-item" onClick={() => handleAction(onNew)}>
                <span>Nuevo documento</span>
              </button>
              <button className="bwjm-dropdown-item" onClick={() => handleAction(onOpen)}>
                <span>Abrir archivo (.bwjm)</span>
                <kbd>Ctrl+O</kbd>
              </button>
              <button className="bwjm-dropdown-item" onClick={() => handleAction(onSave)}>
                <span>Guardar archivo</span>
                <kbd>Ctrl+S</kbd>
              </button>
              <div className="bwjm-dropdown-separator" />
              <button className="bwjm-dropdown-item" onClick={() => handleAction(onExportHtml)}>
                <span>Exportar como HTML interactivo</span>
              </button>
            </div>
          )}
        </div>

        <div className="bwjm-menu-item-wrap">
          <button
            className={`bwjm-menu-btn ${activeMenu === "editar" ? "active" : ""}`}
            onClick={() => handleMenuClick("editar")}
          >
            <span>Editar</span>
            <IconChevronDown size={11} />
          </button>
          {activeMenu === "editar" && (
            <div className="bwjm-dropdown-menu">
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(onOpenCommandPalette)}
              >
                <span>Paleta de comandos</span>
                <kbd>Ctrl+K</kbd>
              </button>
            </div>
          )}
        </div>

        <div className="bwjm-menu-item-wrap">
          <button
            className={`bwjm-menu-btn ${activeMenu === "insertar" ? "active" : ""}`}
            onClick={() => handleMenuClick("insertar")}
          >
            <span>Insertar</span>
            <IconChevronDown size={11} />
          </button>
          {activeMenu === "insertar" && (
            <div className="bwjm-dropdown-menu">
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(onOpenFormulaModal)}
              >
                <span>Fórmula matemática</span>
                <kbd>Ctrl+Shift+M</kbd>
              </button>
              <button className="bwjm-dropdown-item" onClick={() => handleAction(onOpenChartModal)}>
                <span>Gráfica / Parámetro (Asistente)</span>
              </button>
              <div className="bwjm-dropdown-separator" />
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("```plot2d\nequation: sin(x)\nx: [-5, 5]\n```\n"))}
              >
                <span>Gráfica 2D rápida</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("```surface3d\nequation: sin(sqrt(x^2 + y^2))\nx: [-4, 4]\ny: [-4, 4]\n```\n"))}
              >
                <span>Superficie 3D rápida</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("```slider\nname: a\nmin: 0.1\nmax: 5\nstep: 0.1\ndefault: 1.0\n```\n"))}
              >
                <span>Deslizador de parámetro</span>
              </button>
            </div>
          )}
        </div>

        <div className="bwjm-menu-item-wrap">
          <button
            className={`bwjm-menu-btn ${activeMenu === "formato" ? "active" : ""}`}
            onClick={() => handleMenuClick("formato")}
          >
            <span>Formato</span>
            <IconChevronDown size={11} />
          </button>
          {activeMenu === "formato" && (
            <div className="bwjm-dropdown-menu">
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("# ", ""))}
              >
                <span>Encabezado H1</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("## ", ""))}
              >
                <span>Encabezado H2</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("### ", ""))}
              >
                <span>Encabezado H3</span>
              </button>
              <div className="bwjm-dropdown-separator" />
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("**", "**"))}
              >
                <span>Negrita</span>
                <kbd>Ctrl+B</kbd>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("*", "*"))}
              >
                <span>Cursiva</span>
                <kbd>Ctrl+I</kbd>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("`", "`"))}
              >
                <span>Código en línea</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onInsertMarkdown("> ", ""))}
              >
                <span>Bloque de cita</span>
              </button>
            </div>
          )}
        </div>

        <div className="bwjm-menu-item-wrap">
          <button
            className={`bwjm-menu-btn ${activeMenu === "ver" ? "active" : ""}`}
            onClick={() => handleMenuClick("ver")}
          >
            <span>Ver</span>
            <IconChevronDown size={11} />
          </button>
          {activeMenu === "ver" && (
            <div className="bwjm-dropdown-menu">
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onSetViewMode("editor"))}
              >
                <span>Solo editor de código</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onSetViewMode("split"))}
              >
                <span>Vista dividida</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(() => onSetViewMode("reader"))}
              >
                <span>Solo modo lector</span>
              </button>
              <div className="bwjm-dropdown-separator" />
              <button
                className={`bwjm-dropdown-item ${theme === "linear" ? "active" : ""}`}
                onClick={() => handleAction(() => onSetTheme("linear"))}
              >
                <span>Tema: Linear Obsidian</span>
              </button>
              <button
                className={`bwjm-dropdown-item ${theme === "catppuccin" ? "active" : ""}`}
                onClick={() => handleAction(() => onSetTheme("catppuccin"))}
              >
                <span>Tema: Catppuccin Mocha</span>
              </button>
              <button
                className={`bwjm-dropdown-item ${theme === "tokyonight" ? "active" : ""}`}
                onClick={() => handleAction(() => onSetTheme("tokyonight"))}
              >
                <span>Tema: Tokyo Night</span>
              </button>
              <div className="bwjm-dropdown-separator" />
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(onToggleSidebarLeft)}
              >
                <span>Alternar panel izquierdo (Esquema)</span>
              </button>
              <button
                className="bwjm-dropdown-item"
                onClick={() => handleAction(onToggleSidebarRight)}
              >
                <span>Alternar panel derecho (Propiedades)</span>
              </button>
            </div>
          )}
        </div>

        <div className="bwjm-menu-item-wrap">
          <button
            className={`bwjm-menu-btn ${activeMenu === "ayuda" ? "active" : ""}`}
            onClick={() => handleMenuClick("ayuda")}
          >
            <span>Ayuda</span>
            <IconChevronDown size={11} />
          </button>
          {activeMenu === "ayuda" && (
            <div className="bwjm-dropdown-menu">
              <button className="bwjm-dropdown-item" onClick={() => handleAction(onShowHelp)}>
                <span>Acerca de BWJM Studio</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
