# Reproduction sample for duplicated modules

This repository demonstrates an issue with vite's optimizeDeps implementation.

The module 'shared/inner' in `./external/node_modules/shared` is loaded twice during development.
(The weird path is just there to make vite think that the deps were installed via the package manager).

Detailed description: See Issue TODO

## Requirements

Node >= 16, [PNPM](https://pnpm.io/) >= 8

Setup:

```bash
$ pnpm install
```

## Reproduction

Dev mode:

```bash
$ pnpm vite dev
```

Open browser, the site should read "Module 'shared/inner' was loaded 2 time(s).", which demonstrates the issue.

Build:

```bash
$ pnpm vite build
$ pnpm vite preview
```

Open browser, the site should read "Module 'shared/inner' was loaded 1 time(s).", which is the desired outcome.
