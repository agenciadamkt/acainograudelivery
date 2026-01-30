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

const BTZAP_TOKEN = "4a0e432a-2717-42ed-a2cf-39127a768cd8";
const BTZAP_URL = "https://btzap.uazapi.com";

export function formatWhatsAppNumber(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
}

export function getWhatsAppUrl(phone: string, message: string) {
    const formattedPhone = formatWhatsAppNumber(phone);
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Envia uma mensagem via API do BTZAP/UazAPI
 */
export async function sendWhatsAppApiMessage(phone: string, text: string) {
    try {
        const response = await fetch(`${BTZAP_URL}/send/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': BTZAP_TOKEN
            },
            body: JSON.stringify({
                number: formatWhatsAppNumber(phone),
                text: text
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao enviar mensagem via BTZAP:', errorData);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Erro na requisição BTZAP:', error);
        return { success: false, error };
    }
}

/**
 * Envia um menu interativo (botões) via API do BTZAP
 */
export async function sendWhatsAppApiMenu(phone: string, text: string, options: string[]) {
    try {
        const response = await fetch(`${BTZAP_URL}/send/menu`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': BTZAP_TOKEN
            },
            body: JSON.stringify({
                number: formatWhatsAppNumber(phone),
                type: 'button',
                text: text,
                choices: options // Formato: ["Texto do Botão|valor"]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao enviar menu via BTZAP:', errorData);
            return { success: false, error: errorData };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Erro na requisição BTZAP (Menu):', error);
        return { success: false, error };
    }
}
