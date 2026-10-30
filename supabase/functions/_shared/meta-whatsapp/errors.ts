export class MetaWhatsAppError extends Error {
  constructor(public code: string, message: string, public httpStatus?: number, public metaCode?: number, public retryable = false, public metaSubcode?: number, public fbtraceId?: string) { super(message); this.name = 'MetaWhatsAppError'; }
}
