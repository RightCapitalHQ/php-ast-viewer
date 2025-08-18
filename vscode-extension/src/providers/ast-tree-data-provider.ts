import * as vscode from 'vscode';
import { ParserService } from './parser-service';

export class AstTreeDataProvider implements vscode.TreeDataProvider<AstNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<AstNode | undefined | null | void> = new vscode.EventEmitter<AstNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AstNode | undefined | null | void> = this._onDidChangeTreeData.event;

    private ast: any = null;
    private parserService: ParserService;

    constructor(parserService: ParserService) {
        this.parserService = parserService;
    }

    refresh(ast: any): void {
        this.ast = ast;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AstNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AstNode): Thenable<AstNode[]> {
        if (!this.ast) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Root level - return top-level AST nodes
            return Promise.resolve(this.createNodes(this.ast));
        } else {
            // Get children of the element
            return Promise.resolve(this.createNodes(element.data));
        }
    }

    private createNodes(data: any): AstNode[] {
        const nodes: AstNode[] = [];

        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                if (item && typeof item === 'object') {
                    nodes.push(new AstNode(
                        this.getNodeLabel(item, index),
                        item,
                        this.hasChildren(item) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
                    ));
                }
            });
        } else if (data && typeof data === 'object') {
            // Handle single object
            if (data.kind) {
                // It's an AST node
                return [new AstNode(
                    this.getNodeLabel(data),
                    data,
                    this.hasChildren(data) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
                )];
            } else {
                // It's a container object, iterate its properties
                for (const key in data) {
                    if (key === 'loc' || key === 'attributes' || key === 'kind') continue;
                    
                    const value = data[key];
                    if (value && (typeof value === 'object' || Array.isArray(value))) {
                        nodes.push(new AstNode(
                            key,
                            value,
                            this.hasChildren(value) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
                        ));
                    }
                }
            }
        }

        return nodes;
    }

    private getNodeLabel(node: any, index?: number): string {
        if (node.kind) {
            let label = node.kind;
            
            // Add additional context based on node type
            switch (node.kind) {
                case 'function':
                case 'method':
                    if (node.name) {
                        label += `: ${node.name}`;
                    }
                    break;
                case 'class':
                case 'interface':
                case 'trait':
                    if (node.name) {
                        label += `: ${node.name}`;
                    }
                    break;
                case 'variable':
                case 'constref':
                    if (node.name) {
                        label += `: $${node.name}`;
                    }
                    break;
                case 'string':
                case 'number':
                case 'boolean':
                    if (node.value !== undefined) {
                        const value = typeof node.value === 'string' && node.value.length > 20 
                            ? node.value.substring(0, 20) + '...' 
                            : node.value;
                        label += `: ${value}`;
                    }
                    break;
                case 'identifier':
                    if (node.name) {
                        label += `: ${node.name}`;
                    }
                    break;
            }
            
            if (index !== undefined) {
                label = `[${index}] ${label}`;
            }
            
            return label;
        }
        
        if (index !== undefined) {
            return `[${index}]`;
        }
        
        return 'node';
    }

    private hasChildren(node: any): boolean {
        if (!node || typeof node !== 'object') {
            return false;
        }

        if (Array.isArray(node)) {
            return node.length > 0;
        }

        // Check if object has any meaningful children
        for (const key in node) {
            if (key === 'loc' || key === 'attributes' || key === 'kind') continue;
            
            const value = node[key];
            if (value && (typeof value === 'object' || Array.isArray(value))) {
                return true;
            }
        }

        return false;
    }

    getParent(element: AstNode): vscode.ProviderResult<AstNode> {
        // Tree view navigation - not implemented for now
        return null;
    }
}

class AstNode extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly data: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        
        this.tooltip = this.generateTooltip();
        this.contextValue = data?.kind || 'node';
        
        // Add icon based on node type
        if (data?.kind) {
            this.iconPath = this.getIcon(data.kind);
        }
        
        // Add command to highlight in editor when clicked
        if (data?.loc) {
            this.command = {
                command: 'phpAstViewer.highlightNode',
                title: 'Highlight in Editor',
                arguments: [data]
            };
        }
    }

    private generateTooltip(): string {
        if (!this.data || typeof this.data !== 'object') {
            return this.label;
        }

        if (this.data.kind) {
            let tooltip = `Type: ${this.data.kind}`;
            
            if (this.data.loc) {
                const { start, end } = this.data.loc;
                tooltip += `\nLocation: ${start.line}:${start.column} - ${end.line}:${end.column}`;
            }
            
            return tooltip;
        }
        
        return this.label;
    }

    private getIcon(kind: string): vscode.ThemeIcon {
        // Map AST node types to VSCode theme icons
        const iconMap: { [key: string]: string } = {
            'function': 'symbol-function',
            'method': 'symbol-method',
            'class': 'symbol-class',
            'interface': 'symbol-interface',
            'namespace': 'symbol-namespace',
            'variable': 'symbol-variable',
            'property': 'symbol-property',
            'const': 'symbol-constant',
            'if': 'symbol-boolean',
            'for': 'symbol-array',
            'foreach': 'symbol-array',
            'while': 'symbol-array',
            'switch': 'symbol-boolean',
            'return': 'arrow-left',
            'echo': 'output',
            'print': 'output',
            'string': 'symbol-string',
            'number': 'symbol-number',
            'boolean': 'symbol-boolean',
            'array': 'symbol-array',
            'object': 'symbol-object'
        };

        const iconName = iconMap[kind] || 'symbol-misc';
        return new vscode.ThemeIcon(iconName);
    }
}