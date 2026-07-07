import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatBRL } from './utils';

// ─────────────────────────────────────────────────────────────
// Carrega imagem redimensionada → JPEG comprimido (para logos retangulares)
// ─────────────────────────────────────────────────────────────
const getBase64JPEG = (url: string, maxWidth = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, 1);
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas ctx unavailable'));
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error(`Falha ao carregar: ${url}`));
        img.src = url;
    });
};

// Carrega imagem redimensionada → PNG (para logos com transparência)
const getBase64PNG = (url: string, maxWidth = 200): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, 1);
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas ctx unavailable'));
            // SEM fundo branco → preserva transparência
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error(`Falha ao carregar: ${url}`));
        img.src = url;
    });
};

// Cores do tema
const C = {
    purple: [107, 33, 168] as [number, number, number],
    purpleLight: [147, 51, 234] as [number, number, number],
    purpleHeader: [168, 130, 214] as [number, number, number],
    gray900: [17, 24, 39] as [number, number, number],
    gray700: [55, 65, 81] as [number, number, number],
    gray500: [107, 114, 128] as [number, number, number],
    gray400: [156, 163, 175] as [number, number, number],
    gray200: [229, 231, 235] as [number, number, number],
    amber600: [217, 119, 6] as [number, number, number],
};

// ═══════════════════════════════════════════════════════════
// PDF DE DETALHES DO PEDIDO
// ═══════════════════════════════════════════════════════════
export const exportOrderDetailsPDF = async (
    order: any,
    items: any[],
    mode: 'download' | 'print' = 'download',
    franchiseeName?: string
) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ml = 20;
    const mr = pw - 20;

    try {
        // ───────────────────────────────────────────
        // HEADER: Logo NOGRAU® centralizado no topo
        // + "app.acainograu.com.br" abaixo
        // ───────────────────────────────────────────
        let headerBottomY = 40;
        try {
            const nograuLogo = await getBase64JPEG(`/logo-nograu.png?v=${Date.now()}`, 400);
            // NOGRAU retangular 708x166 → no PDF: 50mm x 12mm
            const logoW = 50;
            const logoH = 12;
            doc.addImage(nograuLogo, 'JPEG', (pw - logoW) / 2, 12, logoW, logoH);
            // Texto do site abaixo do logo
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.gray500);
            doc.text('app.acainograu.com.br', pw / 2, 28, { align: 'center' });
            headerBottomY = 40;
        } catch {
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.gray900);
            doc.text('NOGRAU®', pw / 2, 20, { align: 'center' });
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.gray500);
            doc.text('app.acainograu.com.br', pw / 2, 26, { align: 'center' });
            headerBottomY = 38;
        }

        // ─── PEDIDO + STATUS ───
        let y = headerBottomY + 10;

        // Esquerda: PEDIDO
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray500);
        doc.text('PEDIDO', ml, y);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray900);
        doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, ml, y + 8);

        // Direita: STATUS
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray500);
        doc.text('STATUS', mr, y, { align: 'right' });

        const statusMap: Record<string, string> = {
            'pending': 'PENDENTE',
            'approved': 'APROVADO',
            'rejected': 'REJEITADO',
            'shipping': 'EM TRÂNSITO',
            'delivered': 'ENTREGUE'
        };
        const statusText = statusMap[order.status] || (order.status?.toUpperCase() || '—');

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.purpleLight);
        doc.text(statusText, mr, y + 8, { align: 'right' });

        // ─── FRANQUEADO + DATA/HORA ───
        y += 28;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray500);
        doc.text('FRANQUEADO', ml, y);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray900);
        doc.text(
            franchiseeName || order.profiles?.full_name || 'Unidade não identificada',
            ml, y + 7
        );

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray700);
        doc.text(`Pagamento: ${order.payment_method || '—'}`, ml, y + 13);

        // Direita: DATA / HORA
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray500);
        doc.text('DATA / HORA', mr, y, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray900);
        doc.text(format(new Date(order.created_at), "dd/MM/yyyy"), mr, y + 7, { align: 'right' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray700);
        doc.text(format(new Date(order.created_at), "HH:mm'h'"), mr, y + 13, { align: 'right' });

        // ─── TABELA DE ITENS ───
        y += 25;

        // Coluna "Taxa" sempre visível, com o valor real por linha
        // (preço unit. + taxa) × qtd = subtotal — nunca traço, nunca
        // coluna escondida.
        const tableData = items.map(item => [
            item.franchisee_products?.code || '—',
            item.franchisee_products?.name || 'Item',
            item.franchisee_products?.unit || '—',
            String(item.quantity),
            formatBRL(item.unit_price),
            formatBRL((item.taxa_boleto_unit_applied || 0) * item.quantity),
            formatBRL(item.subtotal),
        ]);

        const head = ['Cód.', 'Produto', 'Unid.', 'Qtd', 'Preço Unit.', 'Taxa', 'Subtotal'];

        const columnStyles = {
            0: { halign: 'left' as const, fontStyle: 'bold' as const, cellWidth: 12 },
            1: { halign: 'left' as const, cellWidth: 68 },
            2: { halign: 'left' as const, cellWidth: 12 },
            3: { halign: 'left' as const, fontStyle: 'bold' as const, cellWidth: 12 },
            4: { halign: 'left' as const, cellWidth: 22 },
            5: { halign: 'left' as const, cellWidth: 22 },
            6: { halign: 'left' as const, fontStyle: 'bold' as const, cellWidth: 25 },
        };

        autoTable(doc, {
            startY: y,
            head: [head],
            body: tableData,
            theme: 'plain',
            headStyles: {
                fillColor: C.purpleHeader,
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold',
                cellPadding: 1.5
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 1.5,
                textColor: C.gray900,
            },
            styles: {
                lineColor: C.gray200,
                lineWidth: 0,
                overflow: 'linebreak',
            },
            columnStyles,
        });

        // ─── RESUMO FINANCEIRO ───
        let fY = (doc as any).lastAutoTable.finalY + 15;

        // Subtotal Bruto
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray500);
        doc.text('Subtotal Bruto', pw - 80, fY);
        doc.setTextColor(...C.gray900);
        doc.text(formatBRL(order.subtotal), mr, fY, { align: 'right' });
        fY += 6;

        // Taxa Boleto
        if (order.fees_total > 0) {
            doc.setTextColor(...C.gray500);
            doc.text('Taxa Boleto Bancário', pw - 80, fY);
            doc.setTextColor(...C.amber600);
            doc.text(`+${formatBRL(order.fees_total)}`, mr, fY, { align: 'right' });
            fY += 6;
        }

        // Taxa Publicidade
        if (order.advertising_fee > 0) {
            doc.setTextColor(...C.gray500);
            doc.text('Taxa de Publicidade', pw - 80, fY);
            doc.setTextColor(...C.amber600);
            doc.text(`+${formatBRL(order.advertising_fee)}`, mr, fY, { align: 'right' });
            fY += 6;
        }

        // Linha separadora antes do TOTAL
        fY += 3;
        doc.setDrawColor(...C.purpleLight);
        doc.setLineWidth(0.5);
        doc.line(pw - 80, fY, mr, fY);
        fY += 8;

        // TOTAL
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.purple);
        doc.text('TOTAL', pw - 80, fY);
        doc.text(formatBRL(order.total_amount), mr, fY, { align: 'right' });

        // ─── OBSERVAÇÕES ───
        if (order.notes) {
            fY += 15;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.gray500);
            doc.text('OBSERVAÇÕES', ml, fY);
            fY += 5;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.gray700);
            doc.text(doc.splitTextToSize(order.notes, pw - ml * 2), ml, fY);
        }

        // ───────────────────────────────────────────
        // CARIMBOS DE VERIFICAÇÃO (STAMPS)
        // ───────────────────────────────────────────
        const stampW = 38;
        const stampH = 15;
        const stampY = ph - 25;
        const stampMargin = 6;

        const drawStamp = (x: number, title: string) => {
            // Caixa de fundo + borda
            doc.setDrawColor(...C.gray400);
            doc.setLineWidth(0.25);
            doc.roundedRect(x, stampY, stampW, stampH, 1.5, 1.5, 'S');

            // Título
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.gray900);
            doc.text(title, x + 2, stampY + 4.5);

            // Campos de Data: ___/___/______
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.gray900);
            doc.text('___/___/______', x + 2, stampY + 9.5);

            // Linha de assinatura/conferência extra na base
            doc.setDrawColor(...C.gray900);
            doc.setLineWidth(0.15);
            doc.line(x + 2, stampY + 13, x + stampW - 10, stampY + 13);

            // Checkbox Container (Verde)
            const cbSize = 5;
            const cbX = x + stampW - cbSize - 2.5;
            const cbY = stampY + 5.5;
            doc.setDrawColor(16, 185, 129); // Verde Emerald 500
            doc.setLineWidth(0.4);
            doc.roundedRect(cbX, cbY, cbSize, cbSize, 1, 1, 'S');

            // Ícone de Check (V)
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.6);
            doc.line(cbX + 1, cbY + 2.5, cbX + 2.2, cbY + 4);
            doc.line(cbX + 2.2, cbY + 4, cbX + 4, cbY + 1.2);
        };

        // Desenhar os dois carimbos alinhados à direita
        drawStamp(mr - stampW * 2 - stampMargin, 'Financeiro Ok?');
        drawStamp(mr - stampW, 'Conferido');

        // ───────────────────────────────────────────
        // FOOTER: Logo Açaí no Grau circular pequeno
        // + "Documento gerado em ..."
        // ───────────────────────────────────────────
        const footerY = ph - 15;

        try {
            const acaiLogo = await getBase64PNG(`/logo-acai.png?v=${Date.now()}`, 80);
            doc.addImage(acaiLogo, 'PNG', ml, footerY - 5, 10, 10);
        } catch {
            // fallback
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray500);
        doc.text(`Documento gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, ml + 12, footerY + 1);

        // ─── SAÍDA ───
        if (mode === 'print') {
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } else {
            doc.save(`pedido-${order.id.slice(0, 8)}.pdf`);
        }
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
    }
};

// ═══════════════════════════════════════════════════════════
// PDF DE RELATÓRIO DE PEDIDOS (multi-order list)
// ═══════════════════════════════════════════════════════════
export const exportOrdersReportPDF = async (orders: any[]) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ml = 20;
    const mr = pw - 20;

    try {
        // ─── HEADER ───
        try {
            const logo = await getBase64JPEG(`/logo-nograu.png?v=${Date.now()}`, 250);
            doc.addImage(logo, 'JPEG', ml, 10, 35, 8);
        } catch {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.gray900);
            doc.text('NOGRAU®', ml, 18);
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray900);
        doc.text('Relatório de Pedidos', pw / 2, 18, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray500);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, mr, 18, { align: 'right' });

        doc.setDrawColor(...C.gray200);
        doc.setLineWidth(0.3);
        doc.line(ml, 28, mr, 28);

        // ─── TABELA ───
        const statusLabels: Record<string, string> = {
            'pending': 'Pendente',
            'approved': 'Aprovado',
            'rejected': 'Rejeitado',
            'shipping': 'Em Trânsito',
            'delivered': 'Entregue'
        };

        const tableData = orders.map(order => [
            `#${order.id.slice(0, 8).toUpperCase()}`,
            order.profiles?.full_name || 'N/A',
            format(new Date(order.created_at), "dd/MM/yyyy HH:mm"),
            statusLabels[order.status] || order.status,
            order.payment_method || '—',
            formatBRL(order.total_amount)
        ]);

        autoTable(doc, {
            startY: 34,
            head: [['ID', 'FRANQUEADO', 'DATA / HORA', 'STATUS', 'PAGAMENTO', 'TOTAL']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: C.purpleHeader,
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                cellPadding: 3,
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: C.gray900,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            },
            styles: {
                lineColor: C.gray200,
                lineWidth: 0,
                overflow: 'linebreak',
            },
            columnStyles: {
                0: { cellWidth: 28, fontStyle: 'bold' },
                5: { halign: 'right', fontStyle: 'bold' }
            },
        });

        // ─── TOTAIS ───
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setDrawColor(...C.purpleLight);
        doc.setLineWidth(0.5);
        doc.line(ml, finalY - 3, mr, finalY - 3);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.gray700);
        doc.text(`Total de Pedidos: ${orders.length}`, ml, finalY + 3);

        doc.setFontSize(12);
        doc.setTextColor(...C.purple);
        doc.text(`Volume Total: ${formatBRL(totalRevenue)}`, mr, finalY + 3, { align: 'right' });

        doc.save(`relatorio-pedidos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
        console.error('Erro ao gerar relatório PDF:', error);
    }
};
