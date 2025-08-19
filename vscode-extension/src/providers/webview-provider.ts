import * as vscode from 'vscode';
import * as path from 'path';
import { ParserService } from './parser-service';

export class WebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private parserService: ParserService;
    private currentViewMode: 'tree' | 'json' = 'json';
    private disposables: vscode.Disposable[] = [];
    
    // Source document tracking
    private sourceUri?: vscode.Uri;
    private sourceContent?: string;
    private sourceVersion?: number;

    constructor(context: vscode.ExtensionContext, parserService: ParserService) {
        this.context = context;
        this.parserService = parserService;
    }

    public async showWebview(code: string, fileName: string) {
        const activeEditor = vscode.window.activeTextEditor;
        
        // Determine the target column for the webview
        let targetColumn: vscode.ViewColumn;
        if (activeEditor?.viewColumn) {
            // Try to place webview beside the active editor
            targetColumn = activeEditor.viewColumn === vscode.ViewColumn.One 
                ? vscode.ViewColumn.Two 
                : vscode.ViewColumn.Beside;
        } else {
            // Fallback to column Two
            targetColumn = vscode.ViewColumn.Two;
        }

        // Store source document information
        if (activeEditor && activeEditor.document.fileName === fileName) {
            this.sourceUri = activeEditor.document.uri;
            this.sourceContent = code;
            this.sourceVersion = activeEditor.document.version;
        } else {
            // If the file is not the active editor, still store what we can
            this.sourceUri = vscode.Uri.file(fileName);
            this.sourceContent = code;
            this.sourceVersion = undefined;
        }

        if (this.panel) {
            // If panel exists, reveal it in the target column
            this.panel.reveal(targetColumn);
        } else {
            // Create new panel in the target column
            this.panel = vscode.window.createWebviewPanel(
                'phpAstViewer',
                `PHP AST: ${path.basename(fileName)}`,
                targetColumn,
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

        // Update panel title to reflect current file
        this.panel.title = `PHP AST: ${path.basename(fileName)}`;
        
        // Update content
        this.updateContent(code).catch(err => {
            vscode.window.showErrorMessage(`Failed to parse PHP: ${err.message}`);
        });
    }

    public async updateContent(code: string) {
        if (!this.panel) {
            return;
        }

        // Update source content when re-parsing
        this.sourceContent = code;
        
        // Update version if we're tracking the same document
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && this.sourceUri && 
            activeEditor.document.uri.toString() === this.sourceUri.toString()) {
            this.sourceVersion = activeEditor.document.version;
        }

        // Parse the PHP code
        let ast = await this.parserService.parse(code);
        
        // Ensure AST is in the correct format (array of nodes)
        // PHP parser returns an array, but we need to ensure consistency
        if (ast && !ast.error) {
            if (!Array.isArray(ast)) {
                ast = [ast];
            }
        }
        
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
                    alwaysCollapseFields: config.get('alwaysCollapseFields'),
                    theme: config.get('theme')
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
            case 'updateTheme':
                // Save theme preference to settings
                const config = vscode.workspace.getConfiguration('phpAstViewer');
                config.update('theme', message.payload, vscode.ConfigurationTarget.Global);
                break;
        }
    }

    private async highlightNodeInEditor(nodeInfo: any) {
        // Handle both direct attributes and nested attributes structure
        const attributes = nodeInfo.attributes || nodeInfo;
        
        // Check if we have valid position information
        if (!attributes || (attributes.startFilePos === undefined && attributes.startLine === undefined)) {
            console.warn('Node does not have position information:', nodeInfo);
            vscode.window.showWarningMessage('Cannot highlight: node has no position information');
            return;
        }

        if (!this.sourceUri) {
            vscode.window.showErrorMessage('Source file information is not available');
            return;
        }

        try {
            let editor: vscode.TextEditor | undefined;
            
            // First, try to find if the document is already open
            const openDocument = vscode.workspace.textDocuments.find(
                doc => doc.uri.toString() === this.sourceUri!.toString()
            );

            if (openDocument) {
                // Document is open, check if it's visible in any editor
                editor = vscode.window.visibleTextEditors.find(
                    e => e.document.uri.toString() === this.sourceUri!.toString()
                );

                // Check if document has been modified
                if (this.sourceVersion !== undefined && openDocument.version !== this.sourceVersion) {
                    const choice = await vscode.window.showWarningMessage(
                        'The source file has been modified since parsing. The highlighting might not be accurate.',
                        'Re-parse',
                        'Continue Anyway'
                    );
                    
                    if (choice === 'Re-parse') {
                        // Re-parse the current content
                        const newContent = openDocument.getText();
                        await this.updateContent(newContent);
                        return;
                    } else if (!choice) {
                        return; // User cancelled
                    }
                }

                if (!editor) {
                    // Document is open but not visible, show it
                    editor = await vscode.window.showTextDocument(openDocument, {
                        viewColumn: vscode.ViewColumn.One,
                        preserveFocus: false
                    });
                }
            } else {
                // Document is not open, try to open it
                try {
                    const document = await vscode.workspace.openTextDocument(this.sourceUri);
                    
                    // Check if content has changed
                    if (this.sourceContent && document.getText() !== this.sourceContent) {
                        const choice = await vscode.window.showWarningMessage(
                            'The source file has been modified since parsing. The highlighting might not be accurate.',
                            'Re-parse',
                            'Continue Anyway'
                        );
                        
                        if (choice === 'Re-parse') {
                            await this.updateContent(document.getText());
                            return;
                        } else if (!choice) {
                            return;
                        }
                    }

                    editor = await vscode.window.showTextDocument(document, {
                        viewColumn: vscode.ViewColumn.One,
                        preserveFocus: false
                    });
                } catch (openError) {
                    // File doesn't exist or can't be opened
                    console.error('Failed to open source file:', openError);
                    
                    const choice = await vscode.window.showErrorMessage(
                        `Cannot open source file: ${this.sourceUri.fsPath}\nThe file may have been deleted or moved.`,
                        'Show Cached Content'
                    );
                    
                    if (choice === 'Show Cached Content' && this.sourceContent) {
                        // Create a new untitled document with the cached content
                        const document = await vscode.workspace.openTextDocument({
                            language: 'php',
                            content: this.sourceContent
                        });
                        editor = await vscode.window.showTextDocument(document, {
                            viewColumn: vscode.ViewColumn.One,
                            preserveFocus: false
                        });
                        
                        vscode.window.showInformationMessage('Showing cached content in a new untitled document');
                    } else {
                        return;
                    }
                }
            }

            // Now we have an editor, perform the highlighting
            let startPos: vscode.Position;
            let endPos: vscode.Position;
            
            // Use file positions if available (more accurate)
            if (attributes.startFilePos !== undefined && attributes.endFilePos !== undefined) {
                startPos = editor.document.positionAt(attributes.startFilePos);
                endPos = editor.document.positionAt(attributes.endFilePos);
            } 
            // Fallback to line/column positions
            else if (attributes.startLine !== undefined) {
                const startLine = Math.max(0, (attributes.startLine || 1) - 1);
                const endLine = Math.max(0, (attributes.endLine || attributes.startLine || 1) - 1);
                const startColumn = attributes.startColumn || 0;
                const endColumn = attributes.endColumn || editor.document.lineAt(endLine).text.length;
                
                startPos = new vscode.Position(startLine, startColumn);
                endPos = new vscode.Position(endLine, endColumn);
            } else {
                console.warn('Unable to determine position for node:', nodeInfo);
                return;
            }
            
            const range = new vscode.Range(startPos, endPos);
            
            // Set selection
            editor.selection = new vscode.Selection(startPos, endPos);
            
            // Reveal the range
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            
            // Add decoration
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(255, 255, 0, 0.3)',
                border: '1px solid rgba(255, 255, 0, 0.8)',
                borderRadius: '3px'
            });
            
            editor.setDecorations(decorationType, [range]);
            
            // Remove decoration after 2 seconds
            setTimeout(() => {
                decorationType.dispose();
            }, 2000);
        } catch (error) {
            console.error('Error highlighting node:', error);
            vscode.window.showErrorMessage('Failed to highlight code position');
        }
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

    public isSourceDocument(document: vscode.TextDocument): boolean {
        if (!this.sourceUri) {
            return false;
        }
        return document.uri.toString() === this.sourceUri.toString();
    }

    public highlightNodeAtPosition(position: { position: number; lineNumber: number; column: number }) {
        if (!this.panel) {
            return;
        }

        // Send position to webview to find and highlight the corresponding AST node
        this.panel.webview.postMessage({
            type: 'cursorPositionChanged',
            payload: position
        });
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
        
        // Clear source tracking
        this.sourceUri = undefined;
        this.sourceContent = undefined;
        this.sourceVersion = undefined;
        
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}