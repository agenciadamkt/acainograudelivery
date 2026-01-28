interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

/**
 * Verifica se a loja está aberta no momento atual
 * @param businessHours Horário de funcionamento da loja
 * @returns true se a loja está aberta, false caso contrário
 */
export function isStoreOpen(businessHours: BusinessHours | null): boolean {
  if (!businessHours) return false;

  const now = new Date();
  const dayOfWeek = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ][now.getDay()] as keyof BusinessHours;

  const hours = businessHours[dayOfWeek];

  if (!hours || hours.closed) return false;

  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  return currentTime >= hours.open && currentTime <= hours.close;
}

export function getTodayHoursString(businessHours: BusinessHours | null): string | null {
  if (!businessHours) return null;

  const now = new Date();
  const dayOfWeek = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][now.getDay()] as keyof BusinessHours;

  const hours = businessHours[dayOfWeek];

  if (!hours || hours.closed) return "Fechada";

  return `${hours.open} às ${hours.close}`;
}
