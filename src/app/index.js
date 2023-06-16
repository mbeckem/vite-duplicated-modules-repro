import "virtual:init-all-packages";

// this import triggers optimization of the dependency.
// However, the imports in `virtual:init-all-packages` also refer to parts of the imported package.
// Those imports bypass the optimizer however, because the module paths are fully resolved and the
// resolution was made from a path containing node_modules ("importer").
import "shared"; 

const count = window.SHARED_INNER_EXECUTED;
const sign = count === 1 ? `✅` : `❌`;
const div = document.createElement("div");
div.textContent = `${sign} Module 'shared/inner' was loaded ${count} time(s).`;
document.body.appendChild(div);
