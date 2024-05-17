# ![](public/favicon.svg) PHP AST Viewer

The PHP AST Viewer is a tool for viewing the Abstract Syntax Tree of PHP code. By visualizing the structure, it helps developers gain a deeper understanding of the code, thus improving code quality and maintenance efficiency.

![](docs/images/showcase.gif)

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
pnpm install-and-dev    # This command runs the above three commands.
```

After the development server is running, use the following command to copy the `vendor` folder to `.next/server/`

```bash
pnpm copy-vendor
```

The purpose is to copy the php-parser dependency into the Next.js server folder.
