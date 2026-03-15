import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatBRL } from './utils';

// ─────────────────────────────────────────────────────────────
// Utilidade: carrega imagem e redimensiona no canvas para gerar
// base64 JPEG comprimido. Isso é a chave para PDFs leves.
// ─────────────────────────────────────────────────────────────
const getOptimizedBase64 = (url: string, maxWidth = 300): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            // Calcula proporção mantendo aspect ratio
            const ratio = Math.min(maxWidth / img.width, 1);
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context unavailable'));

            // Fundo branco (evita artefatos de transparência no JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            // JPEG a 85% de qualidade = tamanho drasticamente menor que PNG
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
        img.src = url;
    });
};

// Cores reutilizáveis do tema
const COLORS = {
    purple: [107, 33, 168] as [number, number, number],     // Purple-700
    purpleLight: [147, 51, 234] as [number, number, number], // Purple-600
    gray900: [17, 24, 39] as [number, number, number],
    gray700: [55, 65, 81] as [number, number, number],
    gray500: [107, 114, 128] as [number, number, number],
    gray400: [156, 163, 175] as [number, number, number],
    gray200: [229, 231, 235] as [number, number, number],
    green700: [21, 128, 61] as [number, number, number],
    amber600: [217, 119, 6] as [number, number, number],
};

// ═══════════════════════════════════════════════════════════
// PDF DE DETALHES DO PEDIDO (single order)
// ═══════════════════════════════════════════════════════════
export const exportOrderDetailsPDF = async (
    order: any,
    items: any[],
    mode: 'download' | 'print' = 'download',
    franchiseeName?: string
) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();    // ~210mm
    const ph = doc.internal.pageSize.getHeight();   // ~297mm
    const margin = 20;

    try {
        // ─── HEADER: Logo NOGRAU centralizado ───
        try {
            const logo = await getOptimizedBase64('/logo-nograu.png', 400);
            // Logo retangular: 708x166 original → no PDF: 50mm x 12mm
            const logoW = 50;
            const logoH = 12;
            doc.addImage(logo, 'JPEG', (pw - logoW) / 2, 12, logoW, logoH);
        } catch {
            // Fallback: texto se a imagem não carregar
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.gray900);
            doc.text('NOGRAU', pw / 2, 20, { align: 'center' });
        }

        // Linha separadora fina abaixo do logo
        doc.setDrawColor(...COLORS.gray200);
        doc.setLineWidth(0.3);
        doc.line(margin, 28, pw - margin, 28);

        // ─── PEDIDO ID + STATUS (lado a lado) ───
        let y = 38;

        // Lado esquerdo: "PEDIDO" + #ID
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray500);
        doc.text('PEDIDO', margin, y);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.gray900);
        doc.text(`#${order.id.slice(0, 8).toUpperCase()}`, margin, y + 8);

        // Lado direito: Status
        const statusLabel: Record<string, string> = {
            'pending': 'PENDENTE',
            'approved': 'APROVADO',
            'rejected': 'REJEITADO',
            'shipping': 'EM TRÂNSITO',
            'delivered': 'ENTREGUE'
        };
        const statusText = statusLabel[order.status] || (order.status?.toUpperCase() || '—');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray500);
        doc.text('STATUS', pw - margin, y, { align: 'right' });

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.purpleLight);
        doc.text(statusText, pw - margin, y + 8, { align: 'right' });

        // ─── DADOS DO FRANQUEADO + DATA ───
        y = 60;
        doc.setDrawColor(...COLORS.gray200);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pw - margin, y);
        y += 8;

        // Colunas: esquerda e direita
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.gray500);
        doc.text('FRANQUEADO', margin, y);
        doc.text('DATA / HORA', pw - margin, y, { align: 'right' });

        y += 6;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.gray900);
        doc.text(
            franchiseeName || order.profiles?.full_name || 'Unidade não identificada',
            margin,
            y
        );

        doc.setFont('helvetica', 'bold');
        doc.text(format(new Date(order.created_at), "dd/MM/yyyy"), pw - margin, y, { align: 'right' });

        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray700);
        doc.text(`Pagamento: ${order.payment_method || '—'}`, margin, y);
        doc.text(format(new Date(order.created_at), "HH:mm'h'"), pw - margin, y, { align: 'right' });

        // ─── TABELA DE ITENS ───
        y += 10;

        const tableData = items.map(item => [
            item.franchisee_products?.name || 'Item',
            item.franchisee_products?.unit || '—',
            String(item.quantity),
            formatBRL(item.unit_price),
            order.payment_method === 'Boleto'
                ? formatBRL((item.taxa_boleto_unit_applied || 0) * item.quantity)
                : '—',
            formatBRL(item.subtotal)
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Produto', 'Unid.', 'Qtd', 'Preço Unit.', 'Taxas', 'Subtotal']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: COLORS.purple,
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 4
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: COLORS.gray900,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251] // gray-50
            },
            styles: {
                lineColor: COLORS.gray200,
                lineWidth: 0,
                overflow: 'linebreak',
            },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { halign: 'center', cellWidth: 22 },
                2: { halign: 'center', cellWidth: 16 },
                3: { halign: 'right', cellWidth: 28 },
                4: { halign: 'right', cellWidth: 26 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 28 }
            },
        });

        // ─── RESUMO FINANCEIRO ───
        let fY = (doc as any).lastAutoTable.finalY + 12;

        // Linha separadora
        doc.setDrawColor(...COLORS.gray200);
        doc.setLineWidth(0.3);
        doc.line(pw / 2, fY - 4, pw - margin, fY - 4);

        const addTotalLine = (label: string, value: string, bold = false, color = COLORS.gray900) => {
            doc.setFontSize(9);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setTextColor(...COLORS.gray500);
            doc.text(label, pw - 85, fY);
            doc.setTextColor(...color);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.text(value, pw - margin, fY, { align: 'right' });
            fY += 6;
        };

        addTotalLine('Subtotal Bruto', formatBRL(order.subtotal));

        if (order.fees_total > 0) {
            addTotalLine('Taxa Boleto Bancário', `+${formatBRL(order.fees_total)}`, false, COLORS.amber600);
        }

        if (order.advertising_fee > 0) {
            addTotalLine('Taxa de Publicidade', `+${formatBRL(order.advertising_fee)}`, false, COLORS.amber600);
        }

        // Linha total
        fY += 2;
        doc.setDrawColor(...COLORS.purpleLight);
        doc.setLineWidth(0.5);
        doc.line(pw - 85, fY - 2, pw - margin, fY - 2);

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.purple);
        doc.text('TOTAL', pw - 85, fY + 5);
        doc.text(formatBRL(order.total_amount), pw - margin, fY + 5, { align: 'right' });

        // ─── OBSERVAÇÕES ───
        if (order.notes) {
            fY += 20;
            doc.setDrawColor(...COLORS.gray200);
            doc.setLineWidth(0.2);
            doc.line(margin, fY, pw - margin, fY);
            fY += 8;

            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.gray500);
            doc.text('OBSERVAÇÕES', margin, fY);

            fY += 5;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...COLORS.gray700);
            const wrappedNotes = doc.splitTextToSize(order.notes, pw - margin * 2);
            doc.text(wrappedNotes, margin, fY);
        }

        // ─── FOOTER ───
        const footerY = ph - 18;

        // Linha separadora do footer
        doc.setDrawColor(...COLORS.gray200);
        doc.setLineWidth(0.2);
        doc.line(margin, footerY - 4, pw - margin, footerY - 4);

        // Logo pequeno no footer (reutiliza o mesmo logo NOGRAU)
        try {
            const footerLogo = await getOptimizedBase64('/logo-nograu.png', 150);
            doc.addImage(footerLogo, 'JPEG', margin, footerY - 1, 22, 5);
        } catch {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.gray400);
            doc.text('NOGRAU', margin, footerY + 3);
        }

        // Data de geração
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray400);
        doc.text(
            `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
            pw - margin,
            footerY + 3,
            { align: 'right' }
        );

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
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pw = doc.internal.pageSize.getWidth();
    const margin = 20;

    try {
        // ─── HEADER ───
        try {
            const logo = await getOptimizedBase64('/logo-nograu.png', 250);
            doc.addImage(logo, 'JPEG', margin, 10, 35, 8);
        } catch {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...COLORS.gray900);
            doc.text('NOGRAU', margin, 18);
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.gray900);
        doc.text('Relatório de Pedidos', pw / 2, 16, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.gray500);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pw - margin, 16, { align: 'right' });

        // Linha separadora
        doc.setDrawColor(...COLORS.gray200);
        doc.setLineWidth(0.3);
        doc.line(margin, 24, pw - margin, 24);

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
            startY: 30,
            head: [['ID', 'FRANQUEADO', 'DATA / HORA', 'STATUS', 'PAGAMENTO', 'TOTAL']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: COLORS.purple,
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                cellPadding: 3,
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: COLORS.gray900,
            },
            alternateRowStyles: {
                fillColor: [249, 250, 251]
            },
            styles: {
                lineColor: COLORS.gray200,
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

        // Linha separadora
        doc.setDrawColor(...COLORS.purpleLight);
        doc.setLineWidth(0.5);
        doc.line(margin, finalY - 3, pw - margin, finalY - 3);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.gray700);
        doc.text(`Total de Pedidos: ${orders.length}`, margin, finalY + 3);

        doc.setFontSize(12);
        doc.setTextColor(...COLORS.purple);
        doc.text(`Volume Total: ${formatBRL(totalRevenue)}`, pw - margin, finalY + 3, { align: 'right' });

        // ─── SAÍDA ───
        doc.save(`relatorio-pedidos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
        console.error('Erro ao gerar relatório PDF:', error);
    }
};
