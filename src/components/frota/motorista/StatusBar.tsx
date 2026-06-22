import { format } from 'date-fns';
import { Gauge, MapPinned, HeartPulse, RefreshCw } from 'lucide-react';

interface StatusBarProps {
  gpsAccuracy: number | null;
  gpsStale: boolean;
  lastLocationAt: number | null;
  lastHeartbeatAt: number | null;
  pendingSyncCount: number;
  locationError: string | null;
}

// Linha de status operacional — referência 001.png/003.png: pills curtos e
// espaçados, sem aparência de log técnico (sem emojis de console, sem
// monoespaçado). Cada item tem ícone + valor curto.
export function StatusBar({
  gpsAccuracy, gpsStale, lastLocationAt, lastHeartbeatAt, pendingSyncCount, locationError,
}: StatusBarProps) {
  if (locationError) {
    return (
      <div className="px-4 py-2 bg-red-50 border-b border-red-100">
        <p className="text-[12px] text-red-600 font-medium text-center">{locationError}</p>
      </div>
    );
  }

  const items = [
    {
      icon: Gauge,
      label: gpsAccuracy != null ? `±${gpsAccuracy}m` : 'localizando',
      color: gpsStale ? 'text-amber-600' : 'text-violet-600',
    },
    {
      icon: MapPinned,
      label: lastLocationAt ? format(new Date(lastLocationAt), 'HH:mm:ss') : '—',
      color: 'text-muted-foreground',
    },
    {
      icon: HeartPulse,
      label: lastHeartbeatAt ? format(new Date(lastHeartbeatAt), 'HH:mm:ss') : '—',
      color: 'text-muted-foreground',
    },
    {
      icon: RefreshCw,
      label: pendingSyncCount > 0 ? `${pendingSyncCount} pendente${pendingSyncCount > 1 ? 's' : ''}` : 'sincronizado',
      color: pendingSyncCount > 0 ? 'text-amber-600' : 'text-emerald-600',
    },
  ];

  return (
    <div className="px-4 py-2 bg-white border-b flex items-center justify-center gap-4 overflow-x-auto">
      {items.map(({ icon: Icon, label, color }, i) => (
        <div key={i} className={`flex items-center gap-1 text-[11px] font-medium shrink-0 ${color}`}>
          <Icon className="h-3 w-3" />
          {label}
        </div>
      ))}
    </div>
  );
}
