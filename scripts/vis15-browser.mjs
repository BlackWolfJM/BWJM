/**
 * VIS-15: real Chromium regression separating input preview from change commit.
 * Isolated Playwright install follows scripts/vis06-browser.mjs.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
let browser;
const cases = [
  { id: "triple-product-collapse", target: "coplanar", u: [1,0,0], v: [0,1,0], w: [0,0,1], volumes: [1,.5,0] },
  { id: "collapse-to-zero", target: "zero", u: [2,0,0], v: [0,3,0], w: [0,0,4], volumes: [24,12,0] },
];

async function openText(page, name, content) {
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name, mimeType: "text/plain", buffer: Buffer.from(content),
  });
  await page.waitForFunction(text => document.querySelector(".bwjm-code-textarea")?.value.includes(text), content.slice(0, 25));
}
async function readPlot(page, id) {
  return page.evaluate(id => {
    const plot = document.querySelector("#mount-" + id + " .js-plotly-plot");
    if (!plot || !plot.data || !plot._fullLayout?.scene) return null;
    const camera = plot._fullLayout.scene.camera;
    return {
      traces: plot.data.map(t => ({
        name: t.name, type: t.type,
        x: t.x ? Array.from(t.x) : undefined,
        y: t.y ? Array.from(t.y) : undefined,
        z: t.z ? Array.from(t.z) : undefined,
        text: t.text ? Array.from(t.text) : undefined,
      })),
      camera: camera ? JSON.parse(JSON.stringify(camera)) : null,
    };
  }, id);
}
function expectedFaceVertices(u, v, w) {
  const add = (...vectors) => [0,1,2].map(axis => vectors.reduce((sum, vec) => sum + vec[axis], 0));
  const O = [0,0,0], P = u, Q = v, B = add(u,v),
    R = w, T = add(u,w), U = add(v,w), S = add(u,v,w);
  return {
    "Base (u,v)": [O,P,B,Q],
    "Superior (u,v)+w": [R,T,S,U],
    "Lateral (u,w)": [O,P,T,R],
    "Lateral (u,w)+v": [Q,B,S,U],
    "Lateral (v,w)": [O,Q,U,R],
    "Lateral (v,w)+u": [P,B,S,T],
  };
}
function equalApprox(a,b, description) {
  assert(Math.abs(a-b) < 1e-6, description + ": " + a + " != " + b);
}
function verifyScene(snapshot, spec, factor, volume, effectiveW) {
  assert(snapshot, "Plotly scene missing: " + spec.id);
  const expected = expectedFaceVertices(spec.u,spec.v,effectiveW);
  for (const [name, verts] of Object.entries(expected)) {
    const face = snapshot.traces.find(t => t.name === name && t.type === "mesh3d");
    assert(face, "Missing mesh3d: " + name);
    for (const [axis,index] of [["x",0],["y",1],["z",2]]) {
      verts.forEach((vertex,i) => equalApprox(face[axis][i],vertex[index],name+" "+axis+" vertex "+i));
    }
    for (const axis of ["x","y","z"]) assert(face[axis].every(Number.isFinite), "Non-finite mesh");
  }
  const status = snapshot.traces.find(t=>t.name === "Estado colapso");
  assert(status?.text?.[0]?.includes("Colapso: "+(factor*100).toFixed(1)+"%"), "Stale percentage");
  assert(status?.text?.[0]?.includes("Vol: "+volume.toFixed(4)), "Stale volume");
  const volumeText=snapshot.traces.find(t=>t.name==="Volumen paralelepípedo");
  assert(volumeText?.text?.[0]?.includes(volume===0 ? "V = 0" : "V = "+volume), "Stale volume label");
  const arrow=snapshot.traces.find(t=>t.type==="scatter3d" && /^w \(\d+%\)$/.test(t.name??""));
  if (effectiveW.every(value=>value===0)) assert(!arrow, "Zero w should have no arrow");
  else {
    assert(arrow,"Interpolated w arrow missing");
    for(const [axis,index] of [["x",0],["y",1],["z",2]]) {
      equalApprox(arrow[axis][1],effectiveW[index],"Arrow "+axis);
    }
  }
}
async function awaitScene(page, spec, factor, volume) {
  await page.waitForFunction(({id,factor,volume}) => {
    const plot=document.querySelector("#mount-"+id+" .js-plotly-plot");
    const status=plot?.data?.find(t=>t.name==="Estado colapso")?.text?.[0]??"";
    return status.includes("Colapso: "+(factor*100).toFixed(1)+"%") &&
      status.includes("Vol: "+volume.toFixed(4));
  }, { id:spec.id, factor, volume }, {timeout:20000});
}
async function preview(page, spec, factor, volume, effectiveW) {
  const sourceBefore = await page.locator(".bwjm-code-textarea").inputValue();
  const slider = page.locator("#node-"+spec.id+' input[aria-label="Factor de colapso del paralelepípedo"]');
  await slider.evaluate((input,factor) => {
    input.value = String(factor);
    input.dispatchEvent(new Event("input",{bubbles:true}));
  }, factor);
  await awaitScene(page,spec,factor,volume);
  const snapshot = await readPlot(page,spec.id);
  verifyScene(snapshot,spec,factor,volume,effectiveW);
  const percent=await page.locator("#node-"+spec.id+" .bwjm-graph-collapse-factor output").innerText();
  assert.equal(percent,Math.round(factor*100)+"%");
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(),sourceBefore,
    "Input modified Markdown before confirmation");
  return { slider, snapshot };
}
async function commit(page,slider,spec,factor,volume,effectiveW) {
  await slider.evaluate(input => input.dispatchEvent(new Event("change",{bubbles:true})));
  await page.waitForFunction(({id,factor}) => {
    const src=document.querySelector(".bwjm-code-textarea")?.value??"";
    const block=src.match(new RegExp("```crossproduct\\n(?:(?!```)[\\s\\S])*?id: "+id+"(?:(?!```)[\\s\\S])*?```"))?.[0]??"";
    return block.includes("collapseFactor: "+factor);
  },{id:spec.id,factor},{timeout:10000});
  await awaitScene(page,spec,factor,volume);
  verifyScene(await readPlot(page,spec.id),spec,factor,volume,effectiveW);
}
async function rotateCamera(page,id) {
  const before = JSON.stringify((await readPlot(page,id)).camera);
  const changed=await page.evaluate(async id=>{
    const plot=document.querySelector("#mount-"+id+" .js-plotly-plot");
    const old=JSON.stringify(plot._fullLayout.scene.camera);
    const resource = performance.getEntriesByType("resource")
      .map(entry => entry.name).find(name => name.includes("plotly__js-dist-min"));
    const plotlyApi = window.Plotly ?? (resource ? (await import(resource)).default : null);
    if (plotlyApi?.relayout) {
      await plotlyApi.relayout(plot, {"scene.camera.eye":{x:1.9,y:0.55,z:2.25}});
      return JSON.stringify(plot._fullLayout.scene.camera)!==old;
    }
    return false;
  },id);
  if (!changed) {
    const canvas=page.locator("#mount-"+id+" .gl-container canvas").first();
    const box=await canvas.boundingBox();
    if (!box) throw new Error("3D canvas unavailable for camera rotation");
    const x=box.x+box.width*.52,y=box.y+box.height*.48;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x+90,y+45,{steps:10});
    await page.mouse.up();
  }
  const after=JSON.stringify((await readPlot(page,id)).camera);
  assert.notEqual(after,before,"The camera did not actually rotate before preview");
}

try {
  browser = await chromium.launch({headless:true,args:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
  const page=await browser.newPage({viewport:{width:1360,height:900}});
  for(let i=0;i<45;i++){
    try {
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:4000});
      await page.getByRole("tab",{name:"Insertar"}).waitFor({timeout:5000});
      break;
    }catch(err){ if(i===44)throw err; await new Promise(resolve=>setTimeout(resolve,800));}
  }
  const original=await readFile("examples/T017_MED-03.09-V_collapse_parallelepiped.bwjm","utf8");
  await openText(page,"T017.bwjm",original);
  await page.waitForFunction(()=>!!document.querySelector("#mount-triple-product-collapse .js-plotly-plot")?.data);
  for(const spec of cases){
    const settings=page.locator("#node-"+spec.id+" .bwjm-graph-settings > summary");
    await settings.click();
    await awaitScene(page,spec,0,spec.volumes[0]);
    verifyScene(await readPlot(page,spec.id),spec,0,spec.volumes[0],spec.w);
    const otherId=cases.find(other=>other.id!==spec.id).id;
    const unchanged=JSON.stringify((await readPlot(page,otherId))?.traces);

    await rotateCamera(page,spec.id);
    const cameraBefore=(await readPlot(page,spec.id)).camera;
    assert(cameraBefore?.eye,"No camera after rotation");
    const wHalf=spec.w.map(value=>value*.5);
    const {slider}=await preview(page,spec,.5,spec.volumes[1],wHalf);
    assert.deepEqual((await readPlot(page,spec.id)).camera,cameraBefore,"Preview reset camera");
    assert.equal(JSON.stringify((await readPlot(page,otherId))?.traces),unchanged,
      "Preview touched a different crossproduct graph");
    await commit(page,slider,spec,.5,spec.volumes[1],wHalf);
    assert.deepEqual((await readPlot(page,spec.id)).camera,cameraBefore,"Confirm reset camera");
    const ending=await preview(page,spec,1,0,[0,0,0]);
    await commit(page,ending.slider,spec,1,0,[0,0,0]);
  }

  // Distinguish coplanar from zero when both results have volume zero.
  const sample=["# Metas independientes","",
    ...["coplanar","zero"].map(target=>[
      "```crossproduct", "id: vis15-"+target, "u: [1,0,0]", "v: [0,1,0]",
      "w: [1,1,1]", "origin: [0,0,0]", "showPlane: true",
      "showVolume: true", "showCollapse: true", "collapseFactor: 0",
      "collapseTarget: "+target, "```", "",
    ].join("\n"))].join("\n");
  await openText(page,"metas-vis15.bwjm",sample);
  for(const target of ["coplanar","zero"]){
    const spec={id:"vis15-"+target,target,u:[1,0,0],v:[0,1,0],w:[1,1,1]};
    await page.locator("#node-"+spec.id+" .bwjm-graph-settings > summary").click();
    const expected=target==="coplanar"?[1,1,0]:[0,0,0];
    const {slider}=await preview(page,spec,1,0,expected);
    await commit(page,slider,spec,1,0,expected);
  }
  await page.getByRole("button",{name:"Nuevo documento"}).click();
  assert.equal(await page.locator(".bwjm-graph-collapse-factor").count(),0,
    "Old collapse UI remained on the new tab");
  console.log("VIS-15 browser OK: 0/50/100 volumes, mesh3d, interpolated arrow, live input vs change, camera, independent graphs, targets and tab.");
} finally {
  if(browser)await browser.close();
  server.kill("SIGTERM");
}
