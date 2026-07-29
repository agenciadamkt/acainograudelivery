/**
 * Carimbos "Financeiro Ok?" + "Conferido" no final de PDFs financeiros.
 * Recorta a moldura clara e o branco em volta (fica limpo, com transparência) e,
 * opcionalmente, gira 90° para a horizontal. A largura acompanha a altura de
 * forma proporcional (não distorce).
 *
 * Regra de orientação sugerida: documento retrato → carimbo horizontal
 * (rotate: true); documento paisagem → carimbo vertical (rotate: false).
 */

import type jsPDF from 'jspdf';

const CARIMBOS = ['/carimbo-financeiro.png', '/carimbo-conferido.png'];

function loadCarimbo(url: string, rotate: boolean): Promise<{ data: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = img.naturalWidth || 600;
        const nh = img.naturalHeight || 600;
        const base = document.createElement('canvas');
        base.width = nw; base.height = nh;
        const bx = base.getContext('2d');
        if (!bx) { resolve(null); return; }
        bx.drawImage(img, 0, 0);

        // bounding box do conteúdo (verde do logo + traços/textos escuros),
        // ignorando a moldura cinza-clara e o fundo branco/transparente.
        const px = bx.getImageData(0, 0, nw, nh).data;
        let minX = nw, minY = nh, maxX = -1, maxY = -1;
        for (let y = 0; y < nh; y++) {
          for (let x = 0; x < nw; x++) {
            const i = (y * nw + x) * 4;
            const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
            if (a < 40) continue;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const isGreen = g > 90 && g > r + 25 && g > b + 25;
            if (isGreen || lum < 165) {
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
          }
        }

        let cropX = 0, cropY = 0, cropW = nw, cropH = nh;
        if (maxX >= minX && maxY >= minY) {
          const pad = Math.round(Math.min(nw, nh) * 0.03);
          cropX = Math.max(0, minX - pad);
          cropY = Math.max(0, minY - pad);
          cropW = Math.min(nw - cropX, maxX - minX + pad * 2);
          cropH = Math.min(nh - cropY, maxY - minY + pad * 2);
        }

        const out = document.createElement('canvas');
        if (rotate) {
          out.width = cropH; out.height = cropW; // 90° → dimensões trocadas
          const c = out.getContext('2d');
          if (c) { c.translate(out.width, 0); c.rotate(Math.PI / 2); c.drawImage(base, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH); }
        } else {
          out.width = cropW; out.height = cropH;
          out.getContext('2d')?.drawImage(base, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        }
        resolve({ data: out.toDataURL('image/png'), w: out.width, h: out.height });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Desenha os dois carimbos no final do PDF (alinhados à direita), abrindo nova
 * página se não couber. Retorna o novo Y.
 * @param rotate true = horizontal (docs retrato) · false = vertical (docs paisagem)
 */
export async function addCarimbosNoFinal(
  doc: jsPDF,
  currentY: number,
  opts: { rotate: boolean; stampH?: number },
): Promise<number> {
  const { rotate } = opts;
  const stampH = opts.stampH ?? (rotate ? 15 : 28);
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const GAP = 10;

  const stamps = (await Promise.all(CARIMBOS.map((u) => loadCarimbo(u, rotate))))
    .filter(Boolean) as { data: string; w: number; h: number }[];
  if (stamps.length === 0) return currentY;

  const sized = stamps.map((s) => ({ ...s, dw: (s.w / s.h) * stampH }));
  const totalW = sized.reduce((sum, s) => sum + s.dw, 0) + GAP * (sized.length - 1);

  // Fixa no rodapé (base da página); se o conteúdo chegar até lá, abre nova página.
  let y = PH - 12 - stampH;
  if (y < currentY + 6) { doc.addPage(); y = PH - 12 - stampH; }

  let sx = PW - 14 - totalW; // alinhado à direita
  for (const s of sized) {
    doc.addImage(s.data, 'PNG', sx, y, s.dw, stampH, undefined, 'FAST');
    sx += s.dw + GAP;
  }
  return y + stampH;
}
