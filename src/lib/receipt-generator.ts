
export function generateReceiptHtml(order: any, storeName = "Açaí no Grau") {
    const date = new Date(order.created_at).toLocaleString('pt-BR');
    const items = order.items || [];

    // Header
    let html = `
        <div class="center">
            <h1>${storeName}</h1>
            <p>PEDIDO #${order.id.slice(0, 8)}</p>
            <p>${date}</p>
        </div>
        <div class="line"></div>
    `;

    // Customer
    if (order.customer_name) {
        html += `
            <p><strong>Cliente:</strong> ${order.customer_name}</p>
        `;
    }
    if (order.table_id) {
        // ideally fetch table number, but let's assume table object is joined or just show ID for now
        // If we want table number, we need to join in query. 
        // For now, let's skip or show "Mesa" generic if we don't have number.
        html += `<p><strong>Tipo:</strong> Mesa</p>`;
    } else {
        html += `<p><strong>Tipo:</strong> ${order.sales_channel === 'delivery' ? 'Delivery' : 'Balcão'}</p>`;
    }

    html += `<div class="line"></div>`;

    // Items
    html += `<table>`;
    items.forEach((item: any) => {
        html += `
            <tr>
                <td style="width: 10%">${item.quantity}x</td>
                <td style="width: 60%">${item.product_name}</td>
                <td style="width: 30%" class="right">R$ ${item.total_price.toFixed(2)}</td>
            </tr>
        `;
    });
    html += `</table>`;

    html += `<div class="line"></div>`;

    // Totals
    html += `
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="right">R$ ${order.subtotal.toFixed(2)}</td>
            </tr>
            ${order.discount > 0 ? `
            <tr>
                <td>Desconto:</td>
                <td class="right">- R$ ${order.discount.toFixed(2)}</td>
            </tr>` : ''}
            <tr class="bold" style="font-size: 14px">
                <td>TOTAL:</td>
                <td class="right">R$ ${order.total.toFixed(2)}</td>
            </tr>
        </table>
    `;

    html += `<div class="line"></div>`;

    // Payment
    const methodMap: Record<string, string> = {
        'money': 'Dinheiro',
        'credit': 'Crédito',
        'debit': 'Débito',
        'pix': 'PIX'
    };
    const method = methodMap[order.payment_method] || order.payment_method;

    html += `
        <p>Forma de Pagamento: <strong>${method}</strong></p>
    `;

    if (order.payment_method === 'money' && order.amount_paid) {
        html += `<p>Valor Pago: R$ ${order.amount_paid.toFixed(2)}</p>`;
        if (order.change_amount > 0) {
            html += `<p>Troco: R$ ${order.change_amount.toFixed(2)}</p>`;
        }
    }

    // Footer
    html += `
        <div class="line"></div>
        <div class="center">
            <p>Obrigado pela preferência!</p>
            <p>Volte sempre!</p>
        </div>
    `;

    return html;
}
