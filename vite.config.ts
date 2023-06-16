import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { defineConfig, type Plugin } from "vite";
import { type PluginContext } from "rollup";
import posix from "path/posix";

type ResolveFn = PluginContext["resolve"];

export default defineConfig({
    root: resolve(__dirname, "src"),
    plugins: [
        autoInitPlugin()
    ]
});


const AUTO_INIT_ID = "virtual:init-all-packages";

/**
 * A plugin that walks the entire dependency graph of a package and discovers dependencies
 * that list a `customAutoInit` entry in their `package.json`.
 * 
 * When importing `virtual:init-all-packages`, all auto init scripts will be automatically imported,
 * thus triggering their side effects.
 * 
 * Note that this is just a simplified example to reproduce the original issue.
 */
function autoInitPlugin(): Plugin {
    return {
        name: "auto-init",
        resolveId(id, importer) {
            if (id === AUTO_INIT_ID) {
                const packageJsonPath = findPackageJson(importer);
                return `\0auto-init?from=${packageJsonPath}&noext`; // noext: don't trigger vite's json plugin
            }
        },
        async load(id) {
            if (!/\0auto-init(?:$|\?)/.test(id)) {
                return;
            }

            const packageJsonPath = id.match(/[?&]from=(?<from>.*?)(?:$|&)/)?.groups?.from;
            if (!packageJsonPath) {
                throw new Error("Expected package.json path in virtual module id.");
            }

            const resolve = this.resolve.bind(this);
            const code = await generateAutoInitImports(packageJsonPath, resolve);
            return code;
        }
    }
}

async function generateAutoInitImports(packageJsonPath: string, resolve: ResolveFn)  {
    const autoInitModules = await discoverAutoInitModules(packageJsonPath, resolve);
    return autoInitModules.map((moduleId) => `import ${JSON.stringify(moduleId)};`).join("\n");
}

async function discoverAutoInitModules(packageJsonPath: string, resolve: ResolveFn) {
    const seen = new Set<string>();
    const autoInitModules = new Set<string>();
    const visit  = async (path: string) => {
        let pkg;
        try {
            pkg = JSON.parse(readFileSync(path, "utf-8"));
        } catch (e) {
            throw new Error(`Failed to parse package.json file at ${path}: ${e}`);
        }
        if (pkg.customAutoInit) {
            // Node-style resolve to support things like 'exports' etc.
            // Performs a lookup for e.g. `@pkgName/autoInit` from the package itself, which
            // should work from node_modules.
            //
            // On success, we get an _absolute_ path to the module which will be importable from anywhere without context,
            //
            // This is needed because the virtual `\auto-init...` module cannot use bare imports from its virtual location. 
            const autoInit = (await resolve(posix.join(pkg.name, pkg.customAutoInit), path))?.id;
            if (!autoInit) {
                throw new Error(`Failed to locate auto init module ${pkg.customAutoInit} from from ${path}`);
            }
            autoInitModules.add(autoInit);
        }

        for (const dep of Object.keys(pkg.dependencies ?? {})) {
            const packageJsonPath = (await resolve(`${dep}/package.json`, path))?.id;
            if (!packageJsonPath) {
                throw new Error(`Failed to locate package.json of dependency ${dep} from ${path}`);
            }
            if (seen.has(packageJsonPath)) {
                continue;
            }
            await visit(packageJsonPath);
        }            
    };

    await visit(packageJsonPath);
    return Array.from(autoInitModules);
}

function findPackageJson(importer: string | undefined) {
    if (!importer || !existsSync(importer)) {
        throw new Error(`Importer must be a real file.`);
    }

    // No path traversal for this repro, must be in exact directory
    const packageJsonPath = resolve(dirname(importer), "package.json");
    if (!existsSync(packageJsonPath)) {
        throw new Error(`Expected package.json file in ${dirname(importer)}`);
    }
    return packageJsonPath;
}