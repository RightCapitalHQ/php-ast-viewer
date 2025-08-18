import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export class ParserService {
    private cache: Map<string, any> = new Map();
    private phpParserPath: string;

    constructor() {
        // Find the PHP parser binary in the vendor directory
        this.phpParserPath = this.findPhpParserPath();
    }

    private findPhpParserPath(): string {
        // Get the extension path
        const extensionPath = path.dirname(path.dirname(__dirname));
        const phpParserBin = path.join(extensionPath, 'vendor', 'bin', 'php-parse');
        
        if (fs.existsSync(phpParserBin)) {
            return phpParserBin;
        }
        
        // Fallback path
        return 'php-parse';
    }

    /**
     * Parse PHP code and return AST
     */
    public async parse(code: string): Promise<any> {
        // Preprocess code - auto prepend <?php if missing
        const processedCode = this.preprocessCode(code);
        
        // Check cache
        const cacheKey = this.generateCacheKey(processedCode);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Parse the PHP code using the real parser
            const ast = await this.executePhpParser(processedCode);
            
            // Cache the result
            this.cache.set(cacheKey, ast);
            
            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                if (firstKey !== undefined) {
                    this.cache.delete(firstKey);
                }
            }
            
            return ast;
        } catch (error: any) {
            console.error('PHP Parser Error:', error);
            return {
                error: true,
                message: error.message || 'Failed to parse PHP code',
                details: error
            };
        }
    }

    private async executePhpParser(code: string): Promise<any> {
        return new Promise((resolve, reject) => {
            // Use -j for JSON output and pass code as string argument
            const child = spawn('php', [this.phpParserPath, '-j', code], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data;
            });

            child.stderr.on('data', (data) => {
                stderr += data;
            });

            child.on('close', (exitCode) => {
                if (exitCode === 0) {
                    try {
                        const ast = JSON.parse(stdout);
                        resolve(ast);
                    } catch (e) {
                        reject(new Error('Failed to parse JSON output: ' + e));
                    }
                } else {
                    reject(new Error('PHP parser failed: ' + stderr));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });

            // End stdin immediately since we pass code as argument
            child.stdin.end();
        });
    }

    /**
     * Preprocess PHP code - add <?php tag if missing
     */
    private preprocessCode(code: string): string {
        const trimmedCode = code.trim();
        
        // Check if code already starts with <?php or <?
        if (trimmedCode.startsWith('<?php') || trimmedCode.startsWith('<?')) {
            return code;
        }
        
        // Add <?php tag
        return '<?php\n' + code;
    }

    /**
     * Generate cache key for parsed code
     */
    private generateCacheKey(code: string): string {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    /**
     * Clear the cache
     */
    public clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get node at specific position
     */
    public getNodeAtPosition(ast: any, position: { line: number; column: number }): any {
        if (!ast || ast.error) {
            return null;
        }

        return this.findNodeAtPosition(ast, position);
    }

    private findNodeAtPosition(node: any, position: { line: number; column: number }): any {
        if (!node || typeof node !== 'object') {
            return null;
        }

        // Check if current node contains the position
        if (node.loc) {
            const { start, end } = node.loc;
            if (this.isPositionInRange(position, start, end)) {
                // Check children for more specific node
                let childNode = null;
                
                // Iterate through all properties
                for (const key in node) {
                    if (key === 'loc' || key === 'kind') continue;
                    
                    const value = node[key];
                    if (Array.isArray(value)) {
                        for (const item of value) {
                            const found = this.findNodeAtPosition(item, position);
                            if (found) {
                                childNode = found;
                                break;
                            }
                        }
                    } else if (typeof value === 'object') {
                        const found = this.findNodeAtPosition(value, position);
                        if (found) {
                            childNode = found;
                        }
                    }
                    
                    if (childNode) break;
                }
                
                return childNode || node;
            }
        }

        return null;
    }

    private isPositionInRange(
        position: { line: number; column: number },
        start: { line: number; column: number },
        end: { line: number; column: number }
    ): boolean {
        if (position.line < start.line || position.line > end.line) {
            return false;
        }
        
        if (position.line === start.line && position.column < start.column) {
            return false;
        }
        
        if (position.line === end.line && position.column > end.column) {
            return false;
        }
        
        return true;
    }

    /**
     * Get namespace path for a node
     */
    public getNodeNamespace(ast: any, targetNode: any): string[] {
        const namespace: string[] = [];
        
        const findPath = (node: any, path: string[] = []): boolean => {
            if (node === targetNode) {
                namespace.push(...path);
                return true;
            }

            if (!node || typeof node !== 'object') {
                return false;
            }

            for (const key in node) {
                if (key === 'loc' || key === 'kind') continue;
                
                const value = node[key];
                const currentPath = [...path, key];
                
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        if (findPath(value[i], [...currentPath, i.toString()])) {
                            return true;
                        }
                    }
                } else if (typeof value === 'object') {
                    if (findPath(value, currentPath)) {
                        return true;
                    }
                }
            }
            
            return false;
        };

        findPath(ast);
        return namespace;
    }
}