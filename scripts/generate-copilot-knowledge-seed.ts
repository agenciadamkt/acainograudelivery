// Extração MECÂNICA (via AST, sem reescrever/inventar texto) do array
// `categories` de src/pages/admin/GlobalHelpPage.tsx para popular a tabela
// copilot_knowledge do Copiloto GrauBot — reaproveita o manual operacional já
// escrito e mantido, em vez de duplicar/redigir o mesmo conteúdo à mão.
//
// Uso: npx tsx scripts/generate-copilot-knowledge-seed.ts > supabase/migrations/<timestamp>_seed_copilot_knowledge_from_help.sql
import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_FILE = path.resolve(__dirname, '../src/pages/admin/GlobalHelpPage.tsx');

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function evalNode(node: ts.Node): Json {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(evalNode);
  if (ts.isObjectLiteralExpression(node)) {
    const obj: { [key: string]: Json } = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = prop.name.getText().replace(/^['"]|['"]$/g, '');
      // `icon` referencia um componente lucide-react (identifier) — não é
      // conteúdo textual, não interessa para a base de conhecimento.
      if (key === 'icon') continue;
      obj[key] = evalNode(prop.initializer);
    }
    return obj;
  }
  // Identifiers soltos (ex: import de ícone usado direto) — sem valor textual.
  if (ts.isIdentifier(node)) return null;
  console.warn(`[generate-copilot-knowledge-seed] nó não tratado: ${ts.SyntaxKind[node.kind]} — "${node.getText().slice(0, 60)}"`);
  return null;
}

interface Step { text: string; tip?: string; warn?: string; }
interface Module { id: string; title: string; route?: string; summary: string; steps: Step[]; tips?: string[]; }
interface Category { id: string; label: string; description: string; modules: Module[]; }

function extractCategories(): Category[] {
  const text = fs.readFileSync(SOURCE_FILE, 'utf8');
  const sourceFile = ts.createSourceFile(SOURCE_FILE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  let categoriesNode: ts.ArrayLiteralExpression | null = null;
  sourceFile.forEachChild((node) => {
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((d) => d.name.getText() === 'categories')
    ) {
      const decl = node.declarationList.declarations.find((d) => d.name.getText() === 'categories')!;
      if (decl.initializer && ts.isArrayLiteralExpression(decl.initializer)) {
        categoriesNode = decl.initializer;
      }
    }
  });

  if (!categoriesNode) {
    throw new Error("Não encontrei 'export const categories: Category[] = [...]' em GlobalHelpPage.tsx — a extração mecânica depende dessa declaração existir.");
  }

  return evalNode(categoriesNode) as unknown as Category[];
}

function sqlEscape(str: string): string {
  return str.replace(/'/g, "''");
}

function stepsToContent(module: Module): string {
  const lines: string[] = [module.summary.trim(), ''];
  lines.push('Passo a passo:');
  module.steps.forEach((step, i) => {
    let line = `${i + 1}. ${step.text}`;
    if (step.tip) line += ` (Dica: ${step.tip})`;
    if (step.warn) line += ` (Atenção: ${step.warn})`;
    lines.push(line);
  });
  if (module.tips && module.tips.length > 0) {
    lines.push('', 'Dicas gerais:');
    module.tips.forEach((tip) => lines.push(`- ${tip}`));
  }
  return lines.join('\n');
}

function main() {
  const categories = extractCategories();

  const rows: string[] = [];
  for (const category of categories) {
    for (const module of category.modules) {
      const title = sqlEscape(`${category.label} — ${module.title}`);
      const content = sqlEscape(stepsToContent(module));
      const kbModule = sqlEscape(category.id);
      const routePattern = module.route ? `'${sqlEscape(module.route)}'` : 'NULL';
      const tags = `ARRAY['${sqlEscape(category.id)}', '${sqlEscape(module.id)}']::text[]`;
      rows.push(
        `    ('ajuda_tela', '${title}', '${content}', '${kbModule}', ${routePattern}, ${tags})`
      );
    }
  }

  const sql = `-- ====================================================
-- GrauOS Copilot — Fase 0: seed de copilot_knowledge a partir do
-- manual operacional já escrito em src/pages/admin/GlobalHelpPage.tsx
-- (extração mecânica via scripts/generate-copilot-knowledge-seed.ts,
-- sem reescrever/inventar conteúdo — mesmo texto já usado na Central
-- de Ajuda do GrauOS).
-- ====================================================

INSERT INTO public.copilot_knowledge (category, title, content, module, route_pattern, tags)
VALUES
${rows.join(',\n')}
ON CONFLICT DO NOTHING;
`;

  process.stdout.write(sql);
  console.warn(`[generate-copilot-knowledge-seed] ${rows.length} registros gerados a partir de ${categories.length} categorias.`);
}

main();
