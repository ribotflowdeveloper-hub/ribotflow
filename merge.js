import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, extname } from "path";

// --- Configuració ---
const rootFolder = "./src";
const outputFile = "codi_i_estructura_ribotflow.txt";
const extensionsToInclude = [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".sql"];

const ignoreList = [
  "public",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".DS_Store",
  "package-lock.json",
  "pnpm-lock.yaml",
];

let treeOutput = `ESTRUCTURA DEL PROJECTE (./src)\n\n`;
let contentOutput = "\n\nCONTINGUT DELS FITXERS\n";

function processDirectory(dir, prefix = "") {
  // Llegim i filtrem els arxius i carpetes del directori actual
  const items = readdirSync(dir).filter(item => !ignoreList.includes(item));

  items.forEach((item, index) => {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    const isLast = index === items.length - 1;

    // Afegim la línia corresponent a l'arbre de directoris
    treeOutput += `${prefix}${isLast ? "└── " : "├── "}${item}\n`;

    if (stat.isDirectory()) {
      // Si és un directori, fem la crida recursiva amb el nou prefix
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      processDirectory(fullPath, newPrefix);
    } else if (extensionsToInclude.includes(extname(item))) {
      // Si és un fitxer vàlid, llegim el seu contingut
      const normalizedPath = fullPath.replace(/\\/g, "/");
      contentOutput += `\n\n// =================== FILE: ${normalizedPath} ===================\n\n`;
      contentOutput += readFileSync(fullPath, "utf8");
    }
  });
}

try {
  console.log("🌳 Generant l'arbre de directoris i llegint fitxers...");
  processDirectory(rootFolder);

  // Unim l'arbre i el contingut en un sol fitxer
  const finalOutput = treeOutput + contentOutput;

  writeFileSync(outputFile, finalOutput);
  console.log(`✅ Fitxer creat amb èxit: ${outputFile}`);
} catch (error) {
  console.error("❌ Hi ha hagut un error en crear el fitxer:", error);
}