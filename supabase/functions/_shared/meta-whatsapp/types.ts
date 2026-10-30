export type MetaMessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive' | 'unknown';
export type MetaMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export interface MetaSendResponse { messaging_product: 'whatsapp'; contacts?: Array<{ input: string; wa_id: string }>; messages: Array<{ id: string }>; }
export interface NormalizedMetaMessage { id: string; from: string; timestamp?: string; type: MetaMessageType; text?: string; metadata: Record<string, unknown>; }
export interface NormalizedMetaStatus { id: string; status: MetaMessageStatus; timestamp?: string; recipient_id?: string; metadata: Record<string, unknown>; }
