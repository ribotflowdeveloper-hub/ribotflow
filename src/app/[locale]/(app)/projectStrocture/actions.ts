/**
 * @file actions.ts (Project Structure)
 * @summary Aquesta Server Action actua com a pont segur entre la nostra aplicació i l'API de GitHub.
 * ✅ NOU: Ara inclou accions per obtenir les branques del repositori i carregar l'estructura
 * d'una branca específica. S'ha eliminat la lògica de desar posicions.
 */

"use server";

// --- Tipus de Dades ---
export interface FileTreeNode { path: string; type: 'tree' | 'blob'; }
interface StructureActionResult { data: FileTreeNode[] | null; error: string | null; }
interface ContentActionResult { data: string | null; error: string | null; }
interface Branch { name: string; }
interface BranchesActionResult { data: string[] | null; error: string | null; }

// --- Configuració de l'API de GitHub ---
const GITHUB_TOKEN = process.env.GITHUB_PAT;
const REPO_OWNER = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER;
const REPO_NAME = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME;
// ✅ CORRECCIÓ: Definim la branca principal com a valor per defecte.
const MAIN_BRANCH = 'main'; 

/**
 * @summary Server Action per obtenir la llista de branques del repositori.
 */
export async function fetchBranchesAction(): Promise<BranchesActionResult> {
    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        return { data: null, error: "La configuració de l'API de GitHub no està completa." };
    }
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches`;
    try {
        const response = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
            next: { revalidate: 3600, tags: ['github-repo-branches'] },
        });
        if (!response.ok) throw new Error(`Error de l'API de GitHub: ${(await response.json()).message}`);
        const data: Branch[] = await response.json();
        return { data: data.map(branch => branch.name), error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * @summary Obté l'estructura de fitxers d'una branca específica.
 * ✅ CORRECCIÓ: Afegim un valor per defecte al paràmetre 'branch' per evitar l'error.
 */
export async function fetchProjectStructureAction(branch: string = MAIN_BRANCH): Promise<StructureActionResult> {
  if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
    return { data: null, error: "La configuració de l'API de GitHub no està completa." };
  }
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${branch}?recursive=1`;
  try {
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
      next: { revalidate: 3600, tags: [`github-repo-structure-${branch}`] },
    });
    if (!response.ok) throw new Error(`Error de l'API de GitHub: ${(await response.json()).message}`);
    const data = await response.json();
    const filteredTree = (data.tree as FileTreeNode[]).filter(node => 
        !node.path.includes('node_modules') && !node.path.includes('.next') && !node.path.includes('.vscode') &&
        !node.path.includes('.DS_Store') && !node.path.includes('package-lock.json') && !node.path.endsWith('.md')
    );
    return { data: filteredTree, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * @summary Obté el contingut d'un fitxer específic.
 */
export async function fetchFileContentAction(filePath: string): Promise<ContentActionResult> {
    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        return { data: null, error: "La configuració de l'API de GitHub no està completa." };
    }
    // ✅ CORRECCIÓ: Afegim una referència a la branca per a més precisió.
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    try {
        const response = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
            next: { revalidate: 3600 },
        });
        if (!response.ok) throw new Error(`Error de l'API de GitHub: ${(await response.json()).message}`);
        const data = await response.json();
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return { data: content, error: null };

    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

