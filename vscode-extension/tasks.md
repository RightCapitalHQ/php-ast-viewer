# PHP AST Viewer VSCode Extension - Development Tasks

## Phase 1: Project Setup
- [ ] Create extension directory structure
- [ ] Initialize package.json with extension manifest
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up build toolchain (Vite for webview)
- [ ] Install core dependencies (@types/vscode, vscode-test)
- [ ] Create .vscodeignore file
- [ ] Set up debugging configuration (launch.json)

## Phase 2: Core Extension Implementation
- [ ] Create extension.ts entry point
- [ ] Implement activation/deactivation logic
- [ ] Register extension commands
  - [ ] "PHP AST: View AST" command
  - [ ] "PHP AST: Parse Selection" command
  - [ ] "PHP AST: Parse Current File" command
- [ ] Set up configuration schema
- [ ] Implement extension settings

## Phase 3: Webview Implementation
- [ ] Create WebviewPanel provider
- [ ] Set up Webview HTML template
- [ ] Configure Content Security Policy
- [ ] Implement message passing between extension and webview
  - [ ] Send PHP code to webview
  - [ ] Receive AST node selection from webview
  - [ ] Handle theme changes
- [ ] Set up Vite build for webview assets
- [ ] Configure resource loading (CSS, JS, images)

## Phase 4: PHP Parser Integration
- [ ] Install @rightcapital/php-parser
- [ ] Create parser service
- [ ] Implement code preprocessing (auto-prepend <?php)
- [ ] Handle parsing errors gracefully
- [ ] Cache parsed results for performance

## Phase 5: React Components Migration
- [ ] Set up React in webview
- [ ] Migrate TreeViewer component
- [ ] Migrate JSONViewer component
- [ ] Migrate AST search functionality
- [ ] Port helper functions
  - [ ] findNodeNameSpace
  - [ ] getNodeByNameSpace
  - [ ] searchNodeWithMatchedPosition
- [ ] Adapt Ant Design components for VSCode theme
- [ ] Implement dark/light theme switching

## Phase 6: Editor Integration
- [ ] Implement code highlighting on AST node selection
- [ ] Add document change listeners
- [ ] Sync cursor position with AST selection
- [ ] Create decorations for selected AST nodes
- [ ] Implement "Go to Definition" for AST nodes
- [ ] Add hover provider for AST information

## Phase 7: Tree View Provider
- [ ] Create AST TreeDataProvider
- [ ] Implement sidebar tree view
- [ ] Add icons for different node types
- [ ] Support expand/collapse operations
- [ ] Implement node actions (copy, navigate)
- [ ] Add search/filter capability

## Phase 8: Performance Optimization
- [ ] Implement lazy loading for large AST trees
- [ ] Add virtual scrolling for tree view
- [ ] Optimize React re-renders
- [ ] Implement AST caching strategy
- [ ] Minimize webview bundle size
- [ ] Add loading states and progress indicators

## Phase 9: User Experience
- [ ] Add welcome/walkthrough content
- [ ] Create keyboard shortcuts
- [ ] Implement context menus
- [ ] Add status bar items
- [ ] Create quick pick menu for common operations
- [ ] Add tooltips and help text

## Phase 10: Testing
- [ ] Set up testing framework
- [ ] Write unit tests for parser service
- [ ] Test webview communication
- [ ] Add integration tests for commands
- [ ] Test theme compatibility
- [ ] Test performance with large files

## Phase 11: Documentation
- [ ] Write README.md with features and usage
- [ ] Create CHANGELOG.md
- [ ] Add inline code documentation
- [ ] Create user guide with screenshots
- [ ] Document keyboard shortcuts
- [ ] Add contribution guidelines

## Phase 12: Publishing Preparation
- [ ] Create extension icon
- [ ] Write marketplace description
- [ ] Prepare demo GIFs/videos
- [ ] Set up CI/CD pipeline
- [ ] Configure package scripts
- [ ] Test VSIX package locally
- [ ] Create publisher account
- [ ] Submit to VSCode Marketplace

## Nice-to-Have Features
- [ ] Support for multiple PHP files
- [ ] AST comparison view
- [ ] Export AST to various formats (JSON, XML, GraphViz)
- [ ] Integration with PHP language server
- [ ] Code generation from AST
- [ ] AST transformation tools
- [ ] Performance profiling view
- [ ] Integration with debugging

## Known Issues to Address
- [ ] Handle very large PHP files efficiently
- [ ] Support PHP 8+ syntax features
- [ ] Improve error messages for invalid PHP
- [ ] Handle mixed HTML/PHP files
- [ ] Support for PHP frameworks' special syntax

## Dependencies to Install
```bash
# Core VSCode extension dependencies
npm install --save-dev @types/vscode vscode-test @vscode/test-electron

# Webview dependencies
npm install --save-dev vite @vitejs/plugin-react

# React and UI
npm install react react-dom antd @ant-design/icons

# PHP Parser
npm install @rightcapital/php-parser

# Utilities
npm install lodash
npm install --save-dev @types/lodash

# Build tools
npm install --save-dev esbuild typescript
```

## File Structure
```
vscode-extension/
├── src/
│   ├── extension.ts           # Main extension entry
│   ├── providers/
│   │   ├── WebviewProvider.ts # Webview panel management
│   │   ├── TreeDataProvider.ts # Sidebar tree view
│   │   └── ParserService.ts   # PHP parsing logic
│   └── webview/
│       ├── index.html          # Webview template
│       ├── app.tsx             # React app entry
│       ├── components/         # React components
│       └── utils/              # Helper functions
├── media/                      # Static resources
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite build config
└── .vscodeignore              # Files to exclude from package
```

## Current Status
- [x] Created directory structure
- [x] Created tasks.md file
- [ ] Ready to start Phase 1 implementation