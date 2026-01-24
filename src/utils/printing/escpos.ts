import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EscPosItem {
    quantity: number;
    name: string;
    subtotal: number;
    size?: string;
    toppings?: Array<{ name: string; price: number }>;
    notes?: string;
}

interface EscPosOrder {
    order_number: string;
    created_at: string;
    status: string;
    customer: {
        name: string;
        phone?: string;
    };
    delivery_address?: {
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        state: string;
        zipcode?: string;
    };
    order_type: 'delivery' | 'pickup' | 'dine_in';
    table_number?: string;
    items: EscPosItem[];
    subtotal: number;
    delivery_fee: number;
    discount_amount: number;
    total_amount: number;
    payment_method: string;
    payment_status: string;
    customer_notes?: string;
}

export const generateEscPosCommand = (order: EscPosOrder, storeName: string): any[] => {
    // Helper to format currency
    const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

    // Helper to remove accents (normalization) for thermal printer compatibility
    // "Açaí" -> "Acai", "João" -> "Joao"
    const normalize = (str: string) => {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ç/g, "c")
            .replace(/Ç/g, "C")
            .replace(/[^a-zA-Z0-9\s.,#\-\(\)\/:]/g, ""); // Remove extraneous chars just in case
    };

    // Commands
    const INIT = '\x1B\x40';
    const CENTER = '\x1B\x61\x01';
    const LEFT = '\x1B\x61\x00';
    const BOLD_ON = '\x1B\x45\x01';
    const BOLD_OFF = '\x1B\x45\x00';
    const CUT = '\x1D\x56\x41\x00'; // Cut full
    const LINE = '--------------------------------\n';

    // Header
    const commands: any[] = [
        INIT,
        CENTER,
        BOLD_ON,
        normalize(storeName) + '\n',
        BOLD_OFF,
        LINE,
        LEFT,
        `PEDIDO #${order.order_number}\n`,
        `Data: ${format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}\n`,
        LINE
    ];

    // Customer
    commands.push(BOLD_ON, 'CLIENTE:\n', BOLD_OFF);
    commands.push(normalize(order.customer.name) + '\n');
    if (order.customer.phone) commands.push(`Tel: ${order.customer.phone}\n`);
    commands.push('\n');

    // Delivery Address / Table
    if (order.order_type === 'delivery' && order.delivery_address) {
        commands.push(BOLD_ON, 'ENTREGA:\n', BOLD_OFF);
        const addr = order.delivery_address;
        commands.push(`${normalize(addr.street)}, ${addr.number}\n`);
        if (addr.complement) commands.push(`${normalize(addr.complement)}\n`);

        // Handle neighborhood/city carefully to avoid undefined
        const neighborhood = normalize(addr.neighborhood || '');
        const city = normalize(addr.city || '');
        commands.push(`${neighborhood} - ${city}\n`);

        if (addr.zipcode) commands.push(`${addr.zipcode}\n`);
    } else if (order.order_type === 'dine_in') {
        commands.push(BOLD_ON, `MESA: ${order.table_number || 'N/A'}\n`, BOLD_OFF);
    } else {
        commands.push(BOLD_ON, 'RETIRADA NA LOJA\n', BOLD_OFF);
    }
    commands.push(LINE);

    // Items
    commands.push(BOLD_ON, 'ITENS:\n', BOLD_OFF);
    order.items.forEach((item) => {
        commands.push(`${item.quantity}x ${normalize(item.name)}\n`);
        // Right align price? For simplicity, keeping it simple:
        // commands.push(formatCurrency(item.subtotal) + '\n');

        if (item.size) commands.push(`   Tam: ${normalize(item.size)}\n`);

        if (item.toppings && item.toppings.length > 0) {
            item.toppings.forEach(t => {
                commands.push(`   + ${normalize(t.name)}\n`);
            });
        }

        if (item.notes) {
            commands.push(`   Obs: ${normalize(item.notes)}\n`);
        }
        commands.push('\n');
    });
    commands.push(LINE);

    // Totals
    commands.push(`Subtotal:      ${formatCurrency(order.subtotal)}\n`);
    if (order.delivery_fee > 0) {
        commands.push(`Taxa Entrega:  ${formatCurrency(order.delivery_fee)}\n`);
    }
    if (order.discount_amount > 0) {
        commands.push(`Desconto:     -${formatCurrency(order.discount_amount)}\n`);
    }

    commands.push(CENTER, BOLD_ON, '\n');
    commands.push(`TOTAL: ${formatCurrency(order.total_amount)}\n`);
    commands.push(BOLD_OFF, LEFT, '\n');

    // Payment
    commands.push(LINE);
    const paymentMap: any = {
        'credit_card': 'CARTAO CREDITO',
        'debit_card': 'CARTAO DEBITO',
        'pix': 'PIX',
        'cash': 'DINHEIRO'
    };
    commands.push(`Pagamento: ${paymentMap[order.payment_method] || order.payment_method.toUpperCase()}\n`);

    if (order.customer_notes) {
        commands.push('\n');
        commands.push(BOLD_ON, 'OBSERVACOES:\n', BOLD_OFF);
        // Break lines if needed or just clear normalization
        commands.push(`${normalize(order.customer_notes)}\n`);
    }

    commands.push('\n\n');

    // Footer
    commands.push(CENTER);
    commands.push('Obrigado pela preferencia!\n');
    commands.push('\n\n\n');
    commands.push(CUT);

    return commands;
};
