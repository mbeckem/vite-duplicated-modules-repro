# Reproduction sample for duplicated modules

This repository demonstrates an issue with vite's optimizeDeps implementation.

## Background

The core issue here is that the module `shared/inner` in `./external/node_modules/shared` is loaded twice during development.
(The weird path is just there to make vite think that the deps were installed via the package manager).

One import to `inner/shared` is made indirectly via `import "shared"` from `./src/app/index.js`.
The other import comes from a virtual module (also imported from the same file), that, when served to the browser, looks like this:

```js
// http://localhost:5173/@id/__x00__auto-init?from=$DIR/vite-duplicated-modules-repro/src/app/package.json&noext
import "/@fs/$DIR/vite-duplicated-modules-repro/external/node_modules/dep1/init1.js?v=d7007810";
import "/@fs/$DIR/vite-duplicated-modules-repro/external/node_modules/dep2/init2.js?v=d7007810";
```

There are two copies of `inner/shared`:

1. the original file in `external/node_modules`
2. the bundled chunk in `node_modules/.vite/deps` created by the depsOptimizer for `import "shared"`

The code in `src/app/index.js` uses the bundled chunk, but the imported `init2.js` from the virtual module above uses the original copy.
When both copies are evaluated, the module's side effect is triggered twice.

Note that this is a simplified version of our original problem: duplicated modules cause duplicate classes and objects,
and in our application that messes with object identities and `instanceof` checks.

See also issue TODO

## Running the reproduction

### Requirements

Node >= 16, [PNPM](https://pnpm.io/) >= 8

Setup:

```bash
$ pnpm install
```

After installing dependencies, start vite's dev mode:

```bash
$ pnpm vite dev
```

Open browser, the site should read "Module 'shared/inner' was loaded 2 time(s).", which demonstrates the issue.

The production build behaves correctly:

```bash
$ pnpm vite build
$ pnpm vite preview
```

Open browser, the site should read "Module 'shared/inner' was loaded 1 time(s).", which is the desired outcome.
