import { useEffect, useMemo, useRef, useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { Loader2, ImageOff, Camera, Truck, Route, Search, Download, X, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useComprovantesEntrega, type Comprovante } from '@/hooks/useRotaDoDia';
import { addPdfBranding } from '@/pages/admin/financial/utils/pdfBranding';

// ── Cores PDF (RGB) — mesma paleta neutra usada no Relatório de Rotas, roxo
// institucional só como destaque pontual. ──
const PDF = {
  purple: [124, 58, 237] as [number, number, number],
  textDark: [31, 41, 55] as [number, number, number],
  textMuted: [107, 114, 128] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  bgSubtle: [249, 250, 251] as [number, number, number],
  headerBg: [243, 244, 246] as [number, number, number],
};

interface KpiItem { label: string; value: string }

function drawKpiRow(doc: jsPDF, items: KpiItem[], x: number, y: number, totalWidth: number, boxH = 19) {
  const gap = 3;
  const boxW = (totalWidth - (items.length - 1) * gap) / items.length;
  items.forEach((item, i) => {
    const bx = x + i * (boxW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...PDF.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD');

    doc.setTextColor(...PDF.textDark);
    doc.setFontSize(boxH >= 18 ? 16 : 13);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, bx + boxW / 2, y + boxH * 0.55, { align: 'center', maxWidth: boxW - 4 });

    doc.setTextColor(...PDF.textMuted);
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, bx + boxW / 2, y + boxH * 0.85, { align: 'center', maxWidth: boxW - 4 });
  });
  return boxH;
}

// Converte a foto (URL pública do bucket) em base64 + dimensões reais, pra
// poder embutir no PDF preservando a proporção. Falha silenciosa: comprovante
// sem foto carregável aparece como "Foto indisponível" no relatório, em vez de
// quebrar a exportação inteira.
function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), width: img.naturalWidth, height: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function ComprovantesTab() {
  const { data: comprovantes = [], isLoading } = useComprovantesEntrega();
  const [selected, setSelected] = useState<Comprovante | null>(null);
  const [exporting, setExporting] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Zoom/pan da foto ampliada — a imagem "ampliada" sozinha ainda mostrava o
  // comprovante inteiro na tela, sem aumentar a resolução efetiva o bastante
  // pra ler letra miúda; aqui dá pra ampliar de verdade (scroll/botões) e
  // arrastar pra navegar pela área ampliada.
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.6;
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  useEffect(() => {
    if (zoomOpen) {
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    }
  }, [zoomOpen]);

  const clampPan = (nextPan: { x: number; y: number }, level: number) => {
    const maxOffset = 220 * (level - 1);
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, nextPan.x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, nextPan.y)),
    };
  };

  const applyZoom = (next: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    setZoomLevel(clamped);
    if (clamped <= MIN_ZOOM) setPan({ x: 0, y: 0 });
    else setPan(p => clampPan(p, clamped));
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    applyZoom(zoomLevel + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const handleImageClick = () => {
    if (zoomLevel === MIN_ZOOM) applyZoom(2.2);
  };

  const handleDoubleClick = () => {
    applyZoom(zoomLevel > MIN_ZOOM ? MIN_ZOOM : 2.6);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomLevel <= MIN_ZOOM) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    setPan(clampPan(
      { x: dragStateRef.current.startPanX + dx, y: dragStateRef.current.startPanY + dy },
      zoomLevel
    ));
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clienteQuery, setClienteQuery] = useState('');
  const [driverFilter, setDriverFilter] = useState('todos');

  const driverOptions = useMemo(
    () => Array.from(new Set(comprovantes.map(c => c.driverName).filter((d): d is string => !!d))).sort(),
    [comprovantes]
  );

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? startOfDay(new Date(dateFrom + 'T00:00:00')).getTime() : null;
    const toTs = dateTo ? endOfDay(new Date(dateTo + 'T00:00:00')).getTime() : null;
    const query = clienteQuery.trim().toLowerCase();

    return comprovantes.filter(c => {
      if (fromTs !== null || toTs !== null) {
        if (!c.deliveredAt) return false;
        const t = new Date(c.deliveredAt).getTime();
        if (fromTs !== null && t < fromTs) return false;
        if (toTs !== null && t > toTs) return false;
      }
      if (query && !c.destinatario.toLowerCase().includes(query)) return false;
      if (driverFilter !== 'todos' && (c.driverName ?? '') !== driverFilter) return false;
      return true;
    });
  }, [comprovantes, dateFrom, dateTo, clienteQuery, driverFilter]);

  const filtersAtivos = !!dateFrom || !!dateTo || !!clienteQuery.trim() || driverFilter !== 'todos';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setClienteQuery('');
    setDriverFilter('todos');
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      toast.error('Não há comprovantes para exportar com os filtros atuais.');
      return;
    }

    setExporting(true);
    try {
      const images = await Promise.all(filtered.map(c => loadImageAsDataUrl(c.proofPhotoUrl)));

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      let y = await addPdfBranding(doc, undefined, true);
      y += 5;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF.textDark);
      doc.text('Relatório de Comprovantes de Entrega', margin, y);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF.textMuted);
      doc.text(`Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, y, { align: 'right' });
      y += 5;

      const filtroPartes = [
        dateFrom || dateTo
          ? `Período: ${dateFrom ? format(new Date(dateFrom + 'T12:00:00'), 'dd/MM/yyyy') : '—'} a ${dateTo ? format(new Date(dateTo + 'T12:00:00'), 'dd/MM/yyyy') : '—'}`
          : null,
        clienteQuery.trim() ? `Cliente: "${clienteQuery.trim()}"` : null,
        driverFilter !== 'todos' ? `Motorista: ${driverFilter}` : null,
      ].filter(Boolean);
      doc.setFontSize(9);
      doc.setTextColor(...PDF.textMuted);
      doc.text(filtroPartes.length > 0 ? filtroPartes.join('   ·   ') : 'Todos os comprovantes registrados', margin, y);
      y += 7;

      const clientesUnicos = new Set(filtered.map(c => c.destinatario)).size;
      const motoristasUnicos = new Set(filtered.map(c => c.driverName).filter(Boolean)).size;
      const kpiBoxes: KpiItem[] = [
        { label: 'COMPROVANTES', value: String(filtered.length) },
        { label: 'CLIENTES ÚNICOS', value: String(clientesUnicos) },
        { label: 'MOTORISTAS ENVOLVIDOS', value: String(motoristasUnicos) },
        { label: 'PEDIDOS MANUAIS', value: String(filtered.filter(c => c.tipo === 'manual').length) },
      ];
      const boxH = drawKpiRow(doc, kpiBoxes, margin, y, contentWidth);
      y += boxH + 8;

      const photoColW = 26;
      const rowMinH = 26;

      const body = filtered.map(c => [
        '',
        `#${c.orderNumber}${c.tipo === 'manual' ? ' (Manual)' : ''}`,
        c.destinatario,
        c.deliveredAt ? format(new Date(c.deliveredAt), "dd/MM/yyyy 'às' HH:mm") : '—',
        c.driverName ?? '—',
        c.routeName ?? '—',
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Anexo', 'Pedido', 'Destinatário', 'Entregue em', 'Motorista', 'Rota']],
        body,
        theme: 'plain',
        headStyles: { fillColor: PDF.headerBg, textColor: PDF.textDark, fontSize: 8, halign: 'center', fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: PDF.textDark, minCellHeight: rowMinH, valign: 'middle' },
        alternateRowStyles: { fillColor: PDF.bgSubtle },
        styles: { lineColor: PDF.border, lineWidth: 0.15, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: photoColW },
          1: { cellWidth: 30 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 28 },
          5: { cellWidth: contentWidth - photoColW - 30 - 40 - 30 - 28 },
        },
        margin: { left: margin, right: margin, top: 20 },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const img = images[data.row.index];
            const boxX = data.cell.x + 1.5;
            const boxY = data.cell.y + 1.5;
            const boxW = data.cell.width - 3;
            const boxH2 = data.cell.height - 3;
            if (img) {
              const scale = Math.min(boxW / img.width, boxH2 / img.height);
              const drawW = img.width * scale;
              const drawH = img.height * scale;
              const drawX = boxX + (boxW - drawW) / 2;
              const drawY = boxY + (boxH2 - drawH) / 2;
              try {
                doc.addImage(img.dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
              } catch {
                // segue sem a imagem se o jsPDF rejeitar o formato
              }
            } else {
              doc.setFontSize(6);
              doc.setTextColor(...PDF.textMuted);
              doc.text('Foto\nindisponível', boxX + boxW / 2, boxY + boxH2 / 2, { align: 'center' });
            }
          }
        },
      });

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF.textMuted);
        doc.text('Relatório de Comprovantes de Entrega', margin, pageHeight - 8);
        doc.text(`Pág. ${i} / ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      doc.save(`comprovantes-entrega_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
      toast.success('Relatório exportado com sucesso!');
    } catch (e) {
      console.error('Erro ao exportar comprovantes:', e);
      toast.error('Erro ao gerar o PDF do relatório.');
    } finally {
      setExporting(false);
    }
  };

  // Gera um PDF de uma única página com a foto + dados da entrega e já abre
  // o diálogo de impressão do navegador (autoPrint) — reaproveita a mesma
  // infra de branding/imagem usada no relatório em lote acima.
  const handlePrintComprovante = async (c: Comprovante) => {
    setPrinting(true);
    try {
      const img = await loadImageAsDataUrl(c.proofPhotoUrl);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      let y = await addPdfBranding(doc, undefined, true);
      y += 5;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF.textDark);
      doc.text(`Comprovante de Entrega — Pedido #${c.orderNumber}${c.tipo === 'manual' ? ' (Manual)' : ''}`, margin, y);
      y += 9;

      const fields: [string, string][] = [
        ['Destinatário', c.destinatario],
        ['Entregue em', c.deliveredAt ? format(new Date(c.deliveredAt), "dd/MM/yyyy 'às' HH:mm") : '—'],
        ['Motorista', c.driverName ?? '—'],
        ['Rota', c.routeName ?? '—'],
      ];
      fields.forEach(([label, value]) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF.textMuted);
        doc.text(label.toUpperCase(), margin, y);
        y += 4.5;
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF.textDark);
        doc.text(value, margin, y);
        y += 7;
      });
      y += 3;

      if (img) {
        const maxH = pageHeight - y - 20;
        const scale = Math.min(contentWidth / img.width, maxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = margin + (contentWidth - drawW) / 2;
        doc.setDrawColor(...PDF.border);
        doc.setLineWidth(0.3);
        doc.rect(drawX - 1, y - 1, drawW + 2, drawH + 2);
        doc.addImage(img.dataUrl, 'JPEG', drawX, y, drawW, drawH);
      } else {
        doc.setFontSize(9);
        doc.setTextColor(...PDF.textMuted);
        doc.text('Foto do comprovante indisponível.', margin, y);
      }

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF.textMuted);
      doc.text(`Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, pageHeight - 8);
      doc.text(`Pedido #${c.orderNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });

      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (e) {
      console.error('Erro ao gerar comprovante para impressão:', e);
      toast.error('Erro ao gerar o comprovante para impressão.');
    } finally {
      setPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (comprovantes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <ImageOff className="h-10 w-10 opacity-30" />
        <p className="text-sm">Nenhum comprovante de entrega registrado ainda.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Busca e filtros ── */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">De:</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium whitespace-nowrap">Até:</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar por cliente..."
            value={clienteQuery}
            onChange={e => setClienteQuery(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Motorista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os motoristas</SelectItem>
              {driverOptions.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtersAtivos && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground gap-1">
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={exporting || filtered.length === 0}
          className="h-9 gap-2 text-foreground border-gray-300 ml-auto"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {filtered.length} de {comprovantes.length} comprovante(s)
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <ImageOff className="h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum comprovante encontrado com esses filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="text-left rounded-2xl border bg-white dark:bg-white/[0.03] overflow-hidden hover:shadow-md transition-all"
            >
              <div className="aspect-video bg-muted">
                <img src={c.proofPhotoUrl} alt={`Comprovante #${c.orderNumber}`} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm">#{c.orderNumber}</span>
                  {c.tipo === 'manual' && (
                    <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700 bg-purple-50">
                      Manual
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.destinatario}</p>
                {c.deliveredAt && (
                  <p className="text-[11px] text-emerald-600 font-medium">
                    {format(new Date(c.deliveredAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {c.driverName && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" /> {c.driverName}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" />
              Comprovante #{selected?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="relative group">
                <img
                  src={selected.proofPhotoUrl}
                  alt={`Comprovante #${selected.orderNumber}`}
                  className="w-full rounded-xl border object-contain max-h-[60vh]"
                />
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  title="Ampliar imagem"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Destinatário</p>
                  <p className="font-medium">{selected.destinatario}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Entregue em</p>
                  <p className="font-medium">
                    {selected.deliveredAt
                      ? format(new Date(selected.deliveredAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Motorista
                  </p>
                  <p className="font-medium">{selected.driverName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest flex items-center gap-1">
                    <Route className="h-3 w-3" /> Rota
                  </p>
                  <p className="font-medium">{selected.routeName ?? '—'}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintComprovante(selected)}
                disabled={printing}
                className="w-full gap-2 text-foreground border-gray-300"
              >
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Imprimir comprovante
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zoom em tela cheia da foto do comprovante — com zoom/pan de verdade,
          não só uma versão maior da mesma imagem. */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 bg-black/95 border-none [&>button]:text-white [&>button]:z-20">
          <DialogHeader className="sr-only">
            <DialogTitle>Comprovante #{selected?.orderNumber} ampliado</DialogTitle>
          </DialogHeader>
          {selected && (
            <div
              className="relative w-full h-full overflow-hidden flex items-center justify-center touch-none select-none"
              onWheel={handleWheelZoom}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onDoubleClick={handleDoubleClick}
              onClick={handleImageClick}
            >
              <img
                src={selected.proofPhotoUrl}
                alt={`Comprovante #${selected.orderNumber} — ampliado`}
                draggable={false}
                className={`max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain select-none ${isDragging ? '' : 'transition-transform duration-150'}`}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                  cursor: zoomLevel > MIN_ZOOM ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
              />

              {/* Toolbar de zoom */}
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-1.5"
                onClick={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => applyZoom(zoomLevel - ZOOM_STEP)}
                  disabled={zoomLevel <= MIN_ZOOM}
                  title="Diminuir zoom"
                  className="h-8 w-8 rounded-full text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-white text-xs font-medium w-11 text-center tabular-nums">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => applyZoom(zoomLevel + ZOOM_STEP)}
                  disabled={zoomLevel >= MAX_ZOOM}
                  title="Aumentar zoom"
                  className="h-8 w-8 rounded-full text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                {zoomLevel > MIN_ZOOM && (
                  <button
                    type="button"
                    onClick={() => applyZoom(MIN_ZOOM)}
                    className="h-8 px-2 rounded-full text-white text-xs font-medium hover:bg-white/10"
                  >
                    Redefinir
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
