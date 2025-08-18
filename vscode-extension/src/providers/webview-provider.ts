import * as vscode from 'vscode';
import * as path from 'path';
import { ParserService } from './parser-service';

export class WebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private parserService: ParserService;
    private currentViewMode: 'tree' | 'json' = 'json';
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext, parserService: ParserService) {
        this.context = context;
        this.parserService = parserService;
    }

    public async showWebview(code: string, fileName: string) {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this.panel) {
            // If panel exists, reveal it
            this.panel.reveal(columnToShowIn);
        } else {
            // Create new panel
            this.panel = vscode.window.createWebviewPanel(
                'phpAstViewer',
                `PHP AST: ${path.basename(fileName)}`,
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
                        vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview'))
                    ]
                }
            );

            // Set icon
            this.panel.iconPath = {
                light: vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'ast-icon-light.svg')),
                dark: vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'ast-icon-dark.svg'))
            };

            // Handle panel disposal
            this.panel.onDidDispose(() => {
                this.dispose();
            }, null, this.disposables);

            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                message => {
                    this.handleWebviewMessage(message);
                },
                null,
                this.disposables
            );
        }

        // Update content
        this.updateContent(code).catch(err => {
            vscode.window.showErrorMessage(`Failed to parse PHP: ${err.message}`);
        });
    }

    public async updateContent(code: string) {
        if (!this.panel) {
            return;
        }

        // Parse the PHP code
        const ast = await this.parserService.parse(code);
        
        // Get configuration
        const config = vscode.workspace.getConfiguration('phpAstViewer');
        
        // Update webview HTML
        this.panel.webview.html = await this.getWebviewContent(code, ast);
        
        // Send updated data to webview
        this.panel.webview.postMessage({
            type: 'update',
            payload: {
                code,
                ast,
                config: {
                    defaultView: config.get('defaultView'),
                    expandDepth: config.get('expandDepth'),
                    enableClipboard: config.get('enableClipboard'),
                    alwaysCollapseFields: config.get('alwaysCollapseFields')
                }
            }
        });
    }

    private handleWebviewMessage(message: any) {
        switch (message.type) {
            case 'nodeSelected':
                this.highlightNodeInEditor(message.payload);
                break;
            case 'toggleView':
                this.toggleViewMode();
                break;
            case 'error':
                vscode.window.showErrorMessage(`AST Parser Error: ${message.payload}`);
                break;
            case 'info':
                vscode.window.showInformationMessage(message.payload);
                break;
            case 'copyToClipboard':
                vscode.env.clipboard.writeText(message.payload);
                vscode.window.showInformationMessage('Copied to clipboard');
                break;
        }
    }

    private highlightNodeInEditor(nodeInfo: any) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // Handle both direct attributes and nested attributes structure
        const attributes = nodeInfo.attributes || nodeInfo;
        const { startFilePos, endFilePos } = attributes;
        
        const startPos = editor.document.positionAt(startFilePos);
        const endPos = editor.document.positionAt(endFilePos);
        
        const range = new vscode.Range(startPos, endPos);
        
        // Set selection
        editor.selection = new vscode.Selection(startPos, endPos);
        
        // Reveal the range
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        
        // Add decoration
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            border: '1px solid rgba(255, 255, 0, 0.8)'
        });
        
        editor.setDecorations(decorationType, [range]);
        
        // Remove decoration after 2 seconds
        setTimeout(() => {
            decorationType.dispose();
        }, 2000);
    }

    public toggleViewMode() {
        this.currentViewMode = this.currentViewMode === 'tree' ? 'json' : 'tree';
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'toggleView',
                payload: this.currentViewMode
            });
        }
    }

    public updateConfiguration() {
        if (this.panel) {
            const config = vscode.workspace.getConfiguration('phpAstViewer');
            this.panel.webview.postMessage({
                type: 'configUpdate',
                payload: {
                    defaultView: config.get('defaultView'),
                    expandDepth: config.get('expandDepth'),
                    enableClipboard: config.get('enableClipboard'),
                    alwaysCollapseFields: config.get('alwaysCollapseFields')
                }
            });
        }
    }

    public isWebviewVisible(): boolean {
        return this.panel !== undefined && this.panel.visible;
    }

    private async getWebviewContent(code: string, ast: any): Promise<string> {
        const scriptUri = this.panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview', 'app.js'))
        );
        
        const styleUri = this.panel?.webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview', 'app.css'))
        );

        const config = vscode.workspace.getConfiguration('phpAstViewer');
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel?.webview.cspSource} 'unsafe-inline'; script-src ${this.panel?.webview.cspSource} 'unsafe-inline'; img-src ${this.panel?.webview.cspSource} data:;">
            <link href="${styleUri}" rel="stylesheet">
            <title>PHP AST Viewer</title>
        </head>
        <body>
            <div id="root"></div>
            <script>
                window.initialData = {
                    code: ${JSON.stringify(code)},
                    ast: ${JSON.stringify(ast)},
                    config: ${JSON.stringify({
                        defaultView: config.get('defaultView'),
                        expandDepth: config.get('expandDepth'),
                        enableClipboard: config.get('enableClipboard'),
                        alwaysCollapseFields: config.get('alwaysCollapseFields')
                    })},
                    vscode: acquireVsCodeApi()
                };
            </script>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    public dispose() {
        this.panel = undefined;
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}