# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PHP AST Viewer is a web-based tool that visualizes the Abstract Syntax Tree (AST) of PHP code. It helps developers understand the internal structure of PHP code for debugging, analysis, and educational purposes.

## Development Commands

```bash
# Setup and run development environment
pnpm all-in-one    # Installs all dependencies and starts dev server

# Manual setup (if needed)
composer install   # Install PHP dependencies
pnpm install      # Install Node.js dependencies
pnpm dev          # Start development server

# IMPORTANT: After dev server starts, copy vendor to Next.js
pnpm copy-vendor  # Copies PHP dependencies to .next/server/vendor/

# Other commands
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run linting
```

## Architecture Overview

### Hybrid Parsing Architecture
The application supports both server-side and client-side PHP parsing:
- **Server-side**: `/api/parse.php` uses nikic/php-parser for PHP AST generation
- **Client-side**: Uses @rightcapital/php-parser for JavaScript-based parsing
- Deployed on Vercel with PHP runtime support

### Directory Structure
- `/api` - PHP backend API for server-side parsing
- `/src/app` - Next.js App Router structure
  - `/viewer` - Core viewer components (TreeViewer, JSONViewer, Viewer)
  - `/parse` - API route for parsing integration
  - `/components` - Shared UI components
- `/vendor` - PHP dependencies (must be copied to .next/server/ after install)

### Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript, Ant Design 5
- **Code Editor**: Monaco Editor (VS Code editor)
- **PHP Parsing**: nikic/php-parser (server), @rightcapital/php-parser (client)
- **Visualization**: react-treeview, @yilun-sun/react-json-view

### Key Features
- Real-time PHP code parsing and AST visualization
- Dual view modes: Tree view and JSON view
- Auto-prepend PHP start tag functionality
- Interactive AST node navigation with code highlighting
- Dark/light theme support

## Important Notes

1. **Vendor Directory**: Always run `pnpm copy-vendor` after installing PHP dependencies or the server-side parsing will fail.

2. **No Test Suite**: This project currently has no testing framework or tests configured.

3. **Vercel Deployment**: The project uses Vercel PHP runtime (vercel-php@0.7.1) configured in vercel.json.

4. **Recent Features**: The codebase includes recent optimizations for search functionality (BFS implementation) and auto-prepend PHP tag feature.