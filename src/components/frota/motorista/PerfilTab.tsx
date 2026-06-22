import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, Phone, IdCard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PerfilTabProps {
  motoristaId: string;
  nome: string;
  onLogout: () => void;
}

export function PerfilTab({ motoristaId, nome, onLogout }: PerfilTabProps) {
  const { data: driver } = useQuery({
    queryKey: ['fleet-driver-perfil', motoristaId],
    queryFn: async () => {
      const { data } = await supabase
        .from('fleet_drivers' as any)
        .select('phone, license_number')
        .eq('id', motoristaId)
        .single();
      return data as any;
    },
  });

  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xl">
          {initials || <User className="h-7 w-7" />}
        </div>
        <p className="font-bold text-lg">{nome}</p>
        <p className="text-xs text-muted-foreground">Motorista — Frota</p>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          <div className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Telefone</p>
              <p className="text-sm font-semibold">{driver?.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
              <IdCard className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">CNH</p>
              <p className="text-sm font-semibold">{driver?.license_number || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full h-12 gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" /> Sair
      </Button>
    </div>
  );
}
