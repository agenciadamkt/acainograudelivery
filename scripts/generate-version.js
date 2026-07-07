import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Número de build = quantidade de commits no histórico do git. Cresce
// sozinho a cada novo commit/deploy, sem precisar de um contador persistido
// em arquivo (que exigiria a CI commitar de volta no repo a cada build —
// loop arriscado). Funciona tanto local quanto no GitHub Actions
// (actions/checkout já traz o histórico completo do branch).
function safeExec(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch {
    return fallback;
  }
}

const buildNumber = safeExec('git rev-list --count HEAD', '0');
const commit = safeExec('git rev-parse --short HEAD', 'dev');
const builtAt = new Date().toISOString();
const display = `v1.0.${buildNumber}`;

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// Mantém a chave "version" (timestamp) por compatibilidade com o checador
// de atualização do PWA em AppManager.tsx — só adiciona os campos novos.
fs.writeFileSync(
  path.join(publicDir, 'version.json'),
  JSON.stringify({ version: Date.now().toString(), buildNumber, commit, builtAt, display }),
);

// Constante embutida no bundle — a tela sempre mostra a versão exata do
// build que está rodando, sem precisar de fetch em runtime.
const srcDir = path.resolve('src');
fs.writeFileSync(
  path.join(srcDir, 'version.ts'),
  `// Gerado automaticamente em cada build (scripts/generate-version.js) — não editar à mão.\n` +
  `export const APP_VERSION = ${JSON.stringify(display)};\n` +
  `export const APP_BUILD_NUMBER = ${JSON.stringify(buildNumber)};\n` +
  `export const APP_COMMIT = ${JSON.stringify(commit)};\n` +
  `export const APP_BUILT_AT = ${JSON.stringify(builtAt)};\n`,
);

console.log(`[Version] ${display} (commit ${commit}, built ${builtAt})`);
