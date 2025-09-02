# PHP AST Viewer for Visual Studio Code

A powerful Visual Studio Code extension that visualizes the Abstract Syntax Tree (AST) of PHP code, helping developers understand the internal structure of PHP code for debugging, analysis, and educational purposes.

## Features

- 🌲 **Real-time AST Visualization**: View the AST of your PHP code in tree or JSON format
- 🔍 **Interactive Navigation**: Click on AST nodes to highlight corresponding code in the editor
- 📝 **Multiple Parse Modes**: Parse entire files, selections, or snippets
- 🎨 **Theme Support**: Automatically adapts to your VSCode theme (light/dark/high-contrast)
- 📋 **Sidebar Tree View**: Browse AST structure in the activity bar
- ⚡ **Fast Client-side Parsing**: Uses @rightcapital/php-parser for instant parsing
- 🔧 **Customizable**: Configure default view, expand depth, and more

## Installation

1. Open Visual Studio Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "PHP AST Viewer"
4. Click Install

## Usage

### Commands

- **View PHP AST** (`Cmd+Shift+A` / `Ctrl+Shift+A`): Open AST viewer for current PHP file
- **Parse Selection**: Parse and view AST of selected PHP code
- **Parse Current File**: Parse entire file and update tree view
- **Toggle Tree View**: Switch between tree and JSON visualization

### Context Menu

Right-click in a PHP file to access:

- Parse Selection (when text is selected)
- View PHP AST

### Sidebar

The PHP AST icon in the activity bar provides a tree view of the current file's AST structure.

## Configuration

Configure the extension in VSCode settings:

```json
{
  "phpAstViewer.autoPrependPhpTag": true, // Auto-add <?php if missing
  "phpAstViewer.defaultView": "json", // Default view: "tree" or "json"
  "phpAstViewer.expandDepth": 3, // Default expand depth (0-10)
  "phpAstViewer.enableClipboard": false, // Enable clipboard in JSON view
  "phpAstViewer.alwaysCollapseFields": ["attributes"] // Fields to always collapse
}
```

## How It Works

1. **Select PHP Code**: Open any PHP file or select a code snippet
2. **Run Command**: Use keyboard shortcut or command palette
3. **View AST**: The AST appears in a webview panel
4. **Interact**: Click nodes to highlight code, toggle views, adjust settings

## Features in Detail

### Tree View

- Hierarchical representation of AST nodes
- Expandable/collapsible nodes
- Click to highlight source code

### JSON View

- Raw AST data in JSON format
- Search and filter capabilities
- Copy to clipboard support

### Code Highlighting

- Clicking AST nodes highlights corresponding code
- Bidirectional navigation between code and AST
- Automatic scroll to selection

## Requirements

- Visual Studio Code 1.85.0 or higher
- PHP files (`.php` extension)

## Extension Settings

This extension contributes the following settings:

- `phpAstViewer.autoPrependPhpTag`: Automatically prepend `<?php` tag if missing
- `phpAstViewer.defaultView`: Default visualization mode (tree/json)
- `phpAstViewer.expandDepth`: Default expansion depth for AST nodes
- `phpAstViewer.enableClipboard`: Enable clipboard functionality
- `phpAstViewer.alwaysCollapseFields`: Fields to always collapse in view

## Known Issues

- Large PHP files may take a moment to parse
- Some PHP 8+ syntax features may not be fully supported

## Contributing

Contributions are welcome! Please visit our [GitHub repository](https://github.com/RightCapitalHQ/php-ast-viewer) to:

- Report issues
- Submit pull requests
- Suggest features

## License

MIT License - see [LICENSE](https://github.com/RightCapitalHQ/php-ast-viewer/blob/main/LICENSE) for details.

## Credits

Built with ❤️ by [RightCapital](https://rightcapital.com) using:

- [@rightcapital/php-parser](https://www.npmjs.com/package/@rightcapital/php-parser) - PHP parsing in JavaScript
- [React](https://reactjs.org/) & [Ant Design](https://ant.design/) - UI components
- [Vite](https://vitejs.dev/) - Build tooling

## Changelog

### 0.0.1

- Initial release
- Tree and JSON view modes
- Code highlighting
- Sidebar integration
- Theme support
