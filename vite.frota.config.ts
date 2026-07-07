import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// O projeto tem um `index.html` (app principal) na mesma raiz — o dev server
// do Vite sempre serve o arquivo físico `index.html` em "/", então sem isso
// `npm run dev:frota` abriria o GrauOS inteiro em vez do app do motorista.
// Só reescreve rotas "de página" (sem extensão, fora de caminhos internos do
// Vite/arquivos de origem) para `index-frota.html` — não afeta o build.
function frotaHtmlFallback(): Plugin {
  return {
    name: "frota-html-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const isPageRoute = !url.includes(".") && !url.startsWith("/@") && !url.startsWith("/src") && !url.startsWith("/node_modules");
        if (isPageRoute) req.url = "/index-frota.html";
        next();
      });
    },
  };
}

// O Capacitor exige que o webDir contenha um arquivo chamado exatamente
// `index.html` (é o que `cap add`/`cap sync` procuram pra copiar pros
// projetos nativos) — mas o build gera `index-frota.html` (mesmo nome do
// HTML de entrada). Renomeia o arquivo de saída depois do build, sem afetar
// nome/caminho de nenhum asset (as referências em `dist-frota/assets/*` já
// são absolutas a partir de "/", não dependem do nome do HTML).
function renameOutputToIndexHtml(): Plugin {
  return {
    name: "frota-rename-output-to-index-html",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist-frota");
      const from = path.join(outDir, "index-frota.html");
      const to = path.join(outDir, "index.html");
      if (fs.existsSync(from)) fs.renameSync(from, to);
    },
  };
}

// Config Vite separada e enxuta pro app nativo "Açaí no Grau Motorista"
// (Capacitor) — deliberadamente sem VitePWA/componentTagger/defines de versão
// do app principal, que o módulo motorista não usa. Ver vite.config.ts pro
// build do GrauOS completo.
export default defineConfig({
  server: {
    host: "::",
    port: 8081, // porta diferente da 8080 do app principal, pra rodar os dois em paralelo
  },
  plugins: [react(), frotaHtmlFallback(), renameOutputToIndexHtml()],
  // Por padrão o Vite copia TODA a pasta `public/` (do app principal — jogos,
  // logos de outras lojas, htaccess, service worker do PWA...) pro outDir.
  // Nada disso é referenciado pelo módulo motorista (confirmado por grep),
  // então desligamos isso — webDir do Capacitor fica só com o que o app
  // realmente usa.
  publicDir: false,
  build: {
    outDir: "dist-frota",
    rollupOptions: {
      input: path.resolve(__dirname, "index-frota.html"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
