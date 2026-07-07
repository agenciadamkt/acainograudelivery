import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// O projeto tem um `index.html` (app principal) na mesma raiz — o dev server
// do Vite sempre serve o arquivo físico `index.html` em "/", então sem isso
// `npm run dev:delivery` abriria o GrauOS inteiro em vez do storefront do
// cliente. Só reescreve rotas "de página" (sem extensão, fora de caminhos
// internos do Vite/arquivos de origem) para `index-delivery-app.html` — não
// afeta o build. Mesmo padrão de vite.frota.config.ts.
function deliveryHtmlFallback(): Plugin {
  return {
    name: "delivery-html-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const isPageRoute = !url.includes(".") && !url.startsWith("/@") && !url.startsWith("/src") && !url.startsWith("/node_modules");
        if (isPageRoute) req.url = "/index-delivery-app.html";
        next();
      });
    },
  };
}

// O Capacitor exige que o webDir contenha um arquivo chamado exatamente
// `index.html` — mas o build gera `index-delivery-app.html` (mesmo nome do
// HTML de entrada). Renomeia o arquivo de saída depois do build, sem afetar
// nome/caminho de nenhum asset (as referências em `dist-delivery/assets/*`
// já são absolutas a partir de "/").
function renameOutputToIndexHtml(): Plugin {
  return {
    name: "delivery-rename-output-to-index-html",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist-delivery");
      const from = path.join(outDir, "index-delivery-app.html");
      const to = path.join(outDir, "index.html");
      if (fs.existsSync(from)) fs.renameSync(from, to);
    },
  };
}

// Config Vite separada e enxuta pro app nativo "Açaí no Grau" (Capacitor,
// storefront do cliente) — deliberadamente sem VitePWA/componentTagger/
// defines de versão do app principal, que o fluxo de cliente não usa. Ver
// vite.config.ts (GrauOS completo) e vite.frota.config.ts (app do motorista).
export default defineConfig({
  server: {
    host: "::",
    port: 8082, // 8080=principal, 8081=frota, 8082=delivery — pra rodar os três em paralelo
  },
  plugins: [react(), deliveryHtmlFallback(), renameOutputToIndexHtml()],
  publicDir: false,
  build: {
    outDir: "dist-delivery",
    rollupOptions: {
      input: path.resolve(__dirname, "index-delivery-app.html"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Profile.tsx (rota /profile, presente no app nativo) exibe a versão do
    // app usando esses dois globais — o build principal (vite.config.ts) já
    // os define; sem isso aqui o app quebra com "__APP_VERSION__ is not
    // defined" assim que a tela de perfil é renderizada.
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
    '__BUILD_DATE__': JSON.stringify(new Date().toISOString()),
  },
});
