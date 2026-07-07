import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const WHATSAPP_MESSAGES = {
    pending: (order: any) =>
        `Olá ${order.customer?.name}! Recebemos seu pedido #${order.order_number} na *Açaí no Grau*. Estamos aguardando a confirmação do pagamento/sistema. 🕒`,

    confirmed: (order: any) =>
        `Olá ${order.customer?.name}! Seu pedido #${order.order_number} foi *CONFIRMADO* e já entrou em nossa fila de produção. Logo ele estará pronto! ✅`,

    preparing: (order: any) =>
        `Notícia deliciosa! 🍦 Seu pedido #${order.order_number} já está sendo *PREPARADO* com todo o capricho. Quase lá!`,

    ready: (order: any) =>
        `Seu pedido #${order.order_number} está *PRONTO*! Estamos aguardando o entregador para despachá-lo. 🛍️`,

    out_for_delivery: (order: any) =>
        `Seu pedido #${order.order_number} saiu para *ENTREGA*! 🛵💨 O motoboy está a caminho.`,

    delivered: (order: any) =>
        `Pedido #${order.order_number} entregue! ✅ Esperamos que aproveite seu açaí. Se puder, nos avalie no app! Bom apetite! 💜`,

    cancelled: (order: any) =>
        `Olá ${order.customer?.name}, infelizmente seu pedido #${order.order_number} foi cancelado. Se tiver dúvidas, entre em contato conosco. ❌`
};

export interface WhatsAppApiConfig {
    token: string;
    base_url: string;
}

const DEFAULT_CONFIG: WhatsAppApiConfig = {
    token: "4a0e432a-2717-42ed-a2cf-39127a768cd8",
    base_url: "https://btzap.uazapi.com",
};

export function formatWhatsAppNumber(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
}

export function getWhatsAppUrl(phone: string, message: string) {
    const formattedPhone = formatWhatsAppNumber(phone);
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Envia uma mensagem via API do UazAPI.
 * Aceita config dinâmica do franqueado; usa config padrão se não fornecida.
 */
export async function sendWhatsAppApiMessage(phone: string, text: string, cfg: WhatsAppApiConfig = DEFAULT_CONFIG) {
    try {
        const url = cfg.base_url.replace(/\/$/, '');
        const response = await fetch(`${url}/send/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': cfg.token
            },
            body: JSON.stringify({
                number: formatWhatsAppNumber(phone),
                text: text
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao enviar mensagem via UazAPI:', errorData);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Erro na requisição UazAPI:', error);
        return { success: false, error };
    }
}

/**
 * Envia um menu interativo (botões) via API do UazAPI.
 * Aceita config dinâmica do franqueado; usa config padrão se não fornecida.
 */
export async function sendWhatsAppApiMenu(phone: string, text: string, options: string[], cfg: WhatsAppApiConfig = DEFAULT_CONFIG) {
    try {
        const url = cfg.base_url.replace(/\/$/, '');
        const response = await fetch(`${url}/send/menu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': cfg.token
            },
            body: JSON.stringify({
                number: formatWhatsAppNumber(phone),
                type: 'button',
                text: text,
                choices: options
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao enviar menu via UazAPI:', errorData);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Erro na requisição UazAPI (Menu):', error);
        return { success: false, error };
    }
}
