declare module 'plotly.js-dist-min' {
  interface PlotlyApi {
    newPlot(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
    react(element: HTMLElement, data: unknown[], layout: object, config: object): Promise<unknown>;
    relayout(element: HTMLElement, update: object): Promise<unknown>;
    purge(element: HTMLElement): void;
    Plots: { resize(element: HTMLElement): void };
  }

  const Plotly: PlotlyApi;
  export default Plotly;
}
