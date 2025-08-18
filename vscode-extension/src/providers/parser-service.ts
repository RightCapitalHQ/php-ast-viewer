import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync } from 'child_process';
import * as vscode from 'vscode';

export class ParserService {
  private cache: Map<string, any> = new Map();
  private phpParserPath: string;
  private phpInstalled: boolean = false;
  private phpVersion: string = '';

  constructor() {
    // Check if PHP is installed
    this.checkPhpInstallation();
    // Find the PHP parser binary in the vendor directory
    this.phpParserPath = this.findPhpParserPath();
  }

  private checkPhpInstallation(): void {
    // DEBUG: Force PHP not installed for testing
    const FORCE_PHP_NOT_INSTALLED = false; // Set to true to test PHP not installed scenario

    if (FORCE_PHP_NOT_INSTALLED) {
      this.phpInstalled = false;
      this.showPhpNotInstalledError();
      return;
    }

    try {
      const result = execSync('php -v', { encoding: 'utf8' });
      this.phpInstalled = true;
      // Extract PHP version from output
      const versionMatch = result.match(/PHP (\d+\.\d+\.\d+)/i);
      if (versionMatch) {
        this.phpVersion = versionMatch[1];
      }
    } catch (error) {
      this.phpInstalled = false;
      this.showPhpNotInstalledError();
    }
  }

  private showPhpNotInstalledError(): void {
    const message = 'PHP is not installed on your system. PHP AST Viewer requires PHP to parse code.';
    const installButton = 'Installation Guide';
    const ignoreButton = 'Ignore';

    vscode.window.showErrorMessage(message, installButton, ignoreButton).then((selection) => {
      if (selection === installButton) {
        this.showInstallationGuide();
      }
    });
  }

  private showInstallationGuide(): void {
    const platform = process.platform;
    let instructions = '';

    switch (platform) {
      case 'darwin': // macOS
        instructions = `
**Installing PHP on macOS:**

1. **Using Homebrew (recommended):**
   - Install Homebrew if not installed: https://brew.sh
   - Run: brew install php

2. **Using MacPorts:**
   - Install MacPorts: https://www.macports.org
   - Run: sudo port install php

3. **Download from php.net:**
   - Visit: https://www.php.net/downloads
                `;
        break;

      case 'win32': // Windows
        instructions = `
**Installing PHP on Windows:**

1. **Using XAMPP (easiest):**
   - Download XAMPP: https://www.apachefriends.org
   - Install and add PHP to PATH

2. **Using Chocolatey:**
   - Install Chocolatey: https://chocolatey.org
   - Run: choco install php

3. **Manual installation:**
   - Download from: https://windows.php.net/download
   - Extract and add to system PATH
                `;
        break;

      case 'linux': // Linux
        instructions = `
**Installing PHP on Linux:**

**Ubuntu/Debian:**
   sudo apt-get update
   sudo apt-get install php

**Fedora/RHEL/CentOS:**
   sudo dnf install php

**Arch Linux:**
   sudo pacman -S php

**openSUSE:**
   sudo zypper install php
                `;
        break;

      default:
        instructions = `
**Installing PHP:**

Please visit https://www.php.net/downloads for installation instructions for your operating system.
                `;
    }

    // Create a webview panel to show the instructions
    const panel = vscode.window.createWebviewPanel(
      'phpInstallGuide',
      'PHP Installation Guide',
      vscode.ViewColumn.One,
      {}
    );

    panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
        code {
            background: #f4f4f4;
            padding: 2px 5px;
            border-radius: 3px;
        }
        h2 {
            color: #007ACC;
        }
        a {
            color: #007ACC;
        }
    </style>
</head>
<body>
    <h1>PHP Installation Required</h1>
    <p>PHP AST Viewer requires PHP to be installed on your system to parse PHP code.</p>
    ${this.markdownToHtml(instructions)}
    <hr>
    <p><strong>After installation:</strong></p>
    <ol>
        <li>Restart VS Code</li>
        <li>The extension will automatically detect PHP</li>
    </ol>
</body>
</html>
        `;
  }

  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>')
      .replace(/^   (.+)$/gm, '<code>$1</code>');
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
    // Check if PHP is installed
    if (!this.phpInstalled) {
      this.showPhpNotInstalledError();
      return {
        error: true,
        message: 'PHP is not installed. Please install PHP to use this extension.',
        installGuide: true,
      };
    }

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
        details: error,
      };
    }
  }

  private async executePhpParser(code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Use -j for JSON output and pass code as string argument
      const child = spawn('php', [this.phpParserPath, '-j', code], {
        stdio: ['pipe', 'pipe', 'pipe'],
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

      child.on('error', (error: any) => {
        // Check if error is due to PHP not being found
        if (error.code === 'ENOENT') {
          this.phpInstalled = false;
          this.showPhpNotInstalledError();
          reject(new Error('PHP is not installed or not in PATH'));
        } else {
          reject(error);
        }
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
      hash = (hash << 5) - hash + char;
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
   * Check if PHP is installed
   */
  public isPhpInstalled(): boolean {
    return this.phpInstalled;
  }

  /**
   * Get PHP version
   */
  public getPhpVersion(): string {
    return this.phpVersion;
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
