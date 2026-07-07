import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Retorna sempre a URL de produção para links enviados por e-mail.
// Em localhost o window.location.origin seria http://localhost:3000, o que quebra o link.
export function getAppUrl(): string {
  const isLocal = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? 'https://app.acainograu.com.br' : window.location.origin;
}

export function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
