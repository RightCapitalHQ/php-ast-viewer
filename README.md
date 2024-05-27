# ![](public/favicon.svg) PHP AST Viewer

The PHP AST Viewer is a tool for viewing the Abstract Syntax Tree of PHP code. By visualizing the structure, it helps developers gain a deeper understanding of the code, thus improving code quality and maintenance efficiency.

<img width="1300" alt="image" src="https://github.com/RightCapitalHQ/php-ast-viewer/assets/43896664/e1568e1d-2da1-4af7-955d-276d413d3338">

## Getting Started

First, run commands by this sequence for development server:

```bash
composer install
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the page.

or

```bash
pnpm all-in-one # This command runs the above three commands.
```

After the development server is running, use the following command to copy the `vendor` folder to `.next/server/`

```bash
pnpm copy-vendor
```

The purpose is to copy the php-parser dependency into the Next.js server folder.

## Demo video

https://github.com/RightCapitalHQ/php-ast-viewer/assets/43896664/e6dd70c3-5e58-466d-808e-6eaac383d37f
