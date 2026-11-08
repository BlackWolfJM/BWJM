import { dirname, posix } from "node:path";
import * as vscode from "vscode";
import {
  analyzeMathMD,
  buildGithubExport,
  createPreviewUpdate,
  isAutoPreviewDocument,
  isPreviewReadyMessage,
  isSupportedMathMDLanguage,
  type EditorDiagnostic,
} from "./services.js";

const diagnosticSource = "MathMD";

function activeMarkdownDocument(): vscode.TextDocument | undefined {
  const document = vscode.window.activeTextEditor?.document;
  if (!document) return undefined;
  return isSupportedMathMDLanguage(document.languageId, document.fileName) ? document : undefined;
}

function diagnosticSeverity(severity: EditorDiagnostic["severity"]): vscode.DiagnosticSeverity {
  if (severity === "error") return vscode.DiagnosticSeverity.Error;
  if (severity === "warning") return vscode.DiagnosticSeverity.Warning;
  return vscode.DiagnosticSeverity.Information;
}

function toRange(diagnostic: EditorDiagnostic): vscode.Range {
  return new vscode.Range(
    Math.max(0, diagnostic.startLine - 1),
    Math.max(0, diagnostic.startColumn - 1),
    Math.max(0, diagnostic.endLine - 1),
    Math.max(0, diagnostic.endColumn - 1),
  );
}

function updateDiagnostics(
  collection: vscode.DiagnosticCollection,
  document: vscode.TextDocument,
): ReturnType<typeof analyzeMathMD> | undefined {
  if (!isSupportedMathMDLanguage(document.languageId, document.fileName)) return undefined;

  const analysis = analyzeMathMD(document.getText());
  const diagnostics = analysis.diagnostics.map((item) => {
    const diagnostic = new vscode.Diagnostic(
      toRange(item),
      item.message,
      diagnosticSeverity(item.severity),
    );
    diagnostic.code = item.code;
    diagnostic.source = diagnosticSource;
    return diagnostic;
  });
  collection.set(document.uri, diagnostics);
  return analysis;
}

function getWebviewHtml(extensionUri: vscode.Uri, webview: vscode.Webview, title = "Vista previa MathMD"): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "webview.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "preview.css"));
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${styleUri}">
    <title>${title}</title>
  </head>
  <body>
    <main id="mathmd-root" aria-live="polite">
      <p>Esperando un documento MathMD…</p>
    </main>
    <script src="${scriptUri}"></script>
  </body>
</html>`;
}

class MathMDPreview implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private document: vscode.TextDocument | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (this.document && event.document.uri.toString() === this.document.uri.toString()) {
          this.document = event.document;
          this.sendUpdate();
        }
      }),
    );
  }

  open(document: vscode.TextDocument): void {
    this.document = document;
    if (!this.panel) {
      const distRoot = vscode.Uri.joinPath(this.extensionUri, "dist");
      const mediaRoot = vscode.Uri.joinPath(this.extensionUri, "media");
      this.panel = vscode.window.createWebviewPanel(
        "mathmd.preview",
        "Vista previa MathMD",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [distRoot, mediaRoot],
        },
      );
      this.panel.webview.html = getWebviewHtml(this.extensionUri, this.panel.webview, `MathMD: ${posix.basename(document.uri.path)}`);
      this.panel.webview.onDidReceiveMessage((message: unknown) => {
        if (isPreviewReadyMessage(message)) this.sendUpdate();
      });
      this.panel.onDidDispose(() => {
        this.panel = undefined;
        this.document = undefined;
      });
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
    }
    this.panel.title = `MathMD: ${posix.basename(document.uri.path)}`;
    if (this.panel.visible) this.sendUpdate();
  }

  private sendUpdate(): void {
    if (!this.panel || !this.document) return;
    void this.panel.webview.postMessage(
      createPreviewUpdate(this.document.getText(), this.document.uri.toString()),
    );
  }

  dispose(): void {
    this.panel?.dispose();
    for (const disposable of this.disposables) disposable.dispose();
  }
}

export class BwjmCustomEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "mathmd.bwjmCustomEditor";

  constructor(private readonly extensionUri: vscode.Uri) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new BwjmCustomEditorProvider(context.extensionUri);
    return vscode.window.registerCustomEditorProvider(
      BwjmCustomEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const distRoot = vscode.Uri.joinPath(this.extensionUri, "dist");
    const mediaRoot = vscode.Uri.joinPath(this.extensionUri, "media");

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [distRoot, mediaRoot],
    };

    const docName = posix.basename(document.uri.path) || "document.bwjm";
    webviewPanel.webview.html = getWebviewHtml(
      this.extensionUri,
      webviewPanel.webview,
      `BWJM: ${docName}`,
    );

    const sendUpdate = () => {
      void webviewPanel.webview.postMessage(
        createPreviewUpdate(document.getText(), document.uri.toString()),
      );
    };

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        sendUpdate();
      }
    });

    webviewPanel.webview.onDidReceiveMessage((message: unknown) => {
      if (isPreviewReadyMessage(message)) {
        sendUpdate();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    if (webviewPanel.visible) {
      sendUpdate();
    }
  }
}

async function exportForGithub(document: vscode.TextDocument): Promise<void> {
  const sourceName = posix.basename(document.uri.path) || "document.bwjm";
  const folderSelection = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: document.uri.scheme === "file"
      ? vscode.Uri.file(dirname(document.uri.fsPath))
      : undefined,
    openLabel: "Exportar recursos MathMD aquí",
  });
  const selectedFolder = folderSelection?.[0];
  if (!selectedFolder) return;

  const bundle = buildGithubExport(document.getText(), sourceName);
  const stem = sourceName.replace(/\.[^.]+$/, "") || "document";
  const outputDirectory = vscode.Uri.joinPath(selectedFolder, `${stem}.mathmd-assets`);
  await vscode.workspace.fs.createDirectory(outputDirectory);

  const encoder = new TextEncoder();
  for (const asset of bundle.assets) {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(outputDirectory, asset.path),
      encoder.encode(asset.content),
    );
  }
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(outputDirectory, "manifest.json"),
    encoder.encode(`${JSON.stringify(bundle.manifest, null, 2)}\n`),
  );

  void vscode.window.showInformationMessage(
    `MathMD exportó ${bundle.assets.length} recurso(s) a ${outputDirectory.fsPath}.`,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection("mathmd");
  const preview = new MathMDPreview(context.extensionUri);

  for (const document of vscode.workspace.textDocuments) updateDiagnostics(diagnostics, document);

  const activeDoc = vscode.window.activeTextEditor?.document;
  if (activeDoc && isAutoPreviewDocument(activeDoc.languageId, activeDoc.fileName)) {
    preview.open(activeDoc);
  }

  context.subscriptions.push(
    diagnostics,
    preview,
    BwjmCustomEditorProvider.register(context),
    vscode.workspace.onDidOpenTextDocument((document) => updateDiagnostics(diagnostics, document)),
    vscode.workspace.onDidChangeTextDocument((event) => updateDiagnostics(diagnostics, event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isAutoPreviewDocument(editor.document.languageId, editor.document.fileName)) {
        preview.open(editor.document);
      }
    }),
    vscode.commands.registerCommand("mathmd.openPreview", () => {
      const document = activeMarkdownDocument();
      if (!document) {
        void vscode.window.showWarningMessage("Abre un archivo .bwjm, .jm o Markdown para usar la vista previa MathMD.");
        return;
      }
      preview.open(document);
    }),
    vscode.commands.registerCommand("mathmd.validate", () => {
      const document = activeMarkdownDocument();
      if (!document) {
        void vscode.window.showWarningMessage("Abre un archivo .bwjm, .jm o Markdown para validarlo con MathMD.");
        return;
      }
      const analysis = updateDiagnostics(diagnostics, document);
      const errors = analysis?.diagnostics.filter((item) => item.severity === "error").length ?? 0;
      if (errors === 0) {
        void vscode.window.showInformationMessage("MathMD: el documento es válido.");
      } else {
        void vscode.window.showWarningMessage(`MathMD encontró ${errors} error(es).`);
      }
    }),
    vscode.commands.registerCommand("mathmd.exportGithub", async () => {
      const document = activeMarkdownDocument();
      if (!document) {
        void vscode.window.showWarningMessage("Abre un archivo .bwjm, .jm o Markdown para exportarlo con MathMD.");
        return;
      }
      try {
        await exportForGithub(document);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`MathMD no pudo exportar: ${message}`);
      }
    }),
  );
}

export function deactivate(): void {}
