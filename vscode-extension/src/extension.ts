import * as vscode from 'vscode';
import { WebviewProvider } from './providers/webview-provider';
import { AstTreeDataProvider } from './providers/ast-tree-data-provider';
import { ParserService } from './providers/parser-service';

let webviewProvider: WebviewProvider | undefined;
let treeDataProvider: AstTreeDataProvider | undefined;
let parserService: ParserService | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('PHP AST Viewer extension is now active!');
    
    // Initialize services
    parserService = new ParserService();
    
    webviewProvider = new WebviewProvider(context, parserService);
    treeDataProvider = new AstTreeDataProvider(parserService);

    // Register tree view
    vscode.window.createTreeView('phpAstTree', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: true
    });

    // Register commands
    const viewAstCommand = vscode.commands.registerCommand('phpAstViewer.viewAst', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active PHP file');
            return;
        }

        if (!editor.document.fileName.endsWith('.php')) {
            vscode.window.showErrorMessage('Current file is not a PHP file');
            return;
        }

        const code = editor.document.getText();
        await webviewProvider?.showWebview(code, editor.document.fileName);
    });

    const parseSelectionCommand = vscode.commands.registerCommand('phpAstViewer.parseSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        const selectedText = editor.document.getText(selection);
        await webviewProvider?.showWebview(selectedText, 'Selection');
    });

    const parseCurrentFileCommand = vscode.commands.registerCommand('phpAstViewer.parseCurrentFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const code = editor.document.getText();
        const fileName = editor.document.fileName;
        
        // Parse and update tree view
        const ast = await parserService?.parse(code);
        if (ast) {
            treeDataProvider?.refresh(ast);
            vscode.window.showInformationMessage(`Parsed ${fileName}`);
        }
    });

    const toggleTreeViewCommand = vscode.commands.registerCommand('phpAstViewer.toggleTreeView', () => {
        webviewProvider?.toggleViewMode();
    });

    // Register disposables
    context.subscriptions.push(
        viewAstCommand,
        parseSelectionCommand,
        parseCurrentFileCommand,
        toggleTreeViewCommand
    );

    // Listen to active editor changes
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor && editor.document.fileName.endsWith('.php')) {
            // Auto-parse PHP files when they become active (optional)
            const config = vscode.workspace.getConfiguration('phpAstViewer');
            if (config.get('autoParseOnOpen')) {
                const code = editor.document.getText();
                const ast = await parserService?.parse(code);
                if (ast) {
                    treeDataProvider?.refresh(ast);
                }
            }
        }
    }, null, context.subscriptions);

    // Listen to text document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.fileName.endsWith('.php')) {
            // Debounced parsing on document change
            if (webviewProvider?.isWebviewVisible()) {
                const code = event.document.getText();
                webviewProvider.updateContent(code);
            }
        }
    }, null, context.subscriptions);

    // Listen to configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('phpAstViewer')) {
            webviewProvider?.updateConfiguration();
        }
    }, null, context.subscriptions);

    // Listen to cursor position changes for editor-to-AST synchronization
    let cursorChangeTimeout: NodeJS.Timeout | undefined;
    vscode.window.onDidChangeTextEditorSelection((event) => {
        // Clear previous timeout to debounce
        if (cursorChangeTimeout) {
            clearTimeout(cursorChangeTimeout);
        }

        // Debounce cursor changes to avoid excessive updates
        cursorChangeTimeout = setTimeout(() => {
            if (webviewProvider?.isWebviewVisible() && webviewProvider.isSourceDocument(event.textEditor.document)) {
                const position = event.selections[0].active;
                const offset = event.textEditor.document.offsetAt(position);
                
                webviewProvider.highlightNodeAtPosition({
                    position: offset,
                    lineNumber: position.line + 1, // VS Code uses 0-based lines
                    column: position.character
                });
            }
        }, 100); // 100ms debounce
    }, null, context.subscriptions);
}

export function deactivate() {
    webviewProvider?.dispose();
    console.log('PHP AST Viewer extension is now deactivated');
}