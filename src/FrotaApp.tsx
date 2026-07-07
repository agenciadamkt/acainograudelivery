import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import MotoristaLogin from "@/pages/frota/MotoristaLogin";
import MotoristaDashboard from "@/pages/frota/MotoristaDashboard";
import { FrotaSplashGate } from "@/components/frota/motorista/FrotaSplashGate";

// Raiz do app nativo "Açaí no Grau Motorista" — build enxuto e separado do
// GrauOS principal (ver vite.frota.config.ts / index-frota.html). O módulo
// motorista é autocontido (autenticação própria em localStorage via
// useMotoristaAuth, sem depender de AuthContext/StoreContext/PermissionContext/
// CartContext/PrinterContext), então essa árvore só monta o que é realmente
// usado em runtime pelas telas de frota: react-query, tema (por causa do
// Sonner, que lê o tema via next-themes) e o roteador com as duas telas.
const queryClient = new QueryClient();

export default function FrotaApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<FrotaSplashGate />} />
            <Route path="/frota/login" element={<MotoristaLogin />} />
            <Route path="/frota/dashboard" element={<MotoristaDashboard />} />
            <Route path="*" element={<Navigate to="/frota/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
