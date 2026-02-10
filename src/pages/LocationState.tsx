import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import InstallPWAModal from "@/components/InstallPWAModal";
import locationBg from "@/assets/location-bg.jpg";
import { useActiveStates } from "@/hooks/useActiveStates";
import { toast } from "sonner";
import { MapPin, Search } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";

/**
 * Mapeamento de siglas para nomes completos (para exibição)
 */
const STATE_CODE_TO_NAME: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
  'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
  'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
  'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
  'SE': 'Sergipe', 'TO': 'Tocantins'
};

const LocationState = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState("");
  const { data: states = [], isLoading, error } = useActiveStates();
  const { currentStore } = useStore();

  // Redirect if store is already selected
  useEffect(() => {
    // Only redirect if currentStore exists and has a slug
    // We check for slug to ensure it's a valid loaded store
    if (currentStore?.slug) {
      console.log("Redirecting to saved store:", currentStore.name);
      navigate(`/delivery/${currentStore.slug}`);
    }
  }, [currentStore, navigate]);

  const handleContinue = () => {
    if (!selectedState) {
      toast.error("Por favor, selecione um estado");
      return;
    }

    localStorage.setItem("selectedState", selectedState);
    navigate("/location-city");
  };

  const handleUseLocation = () => {
    navigate("/location-city?useLocation=true");
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-end p-6 relative pb-10"
      style={{
        backgroundImage: `url(${locationBg})`,
        backgroundColor: '#5D3E8E',
        backgroundPosition: 'center 15%'
      }}
    >
      <InstallPWAModal />

      {/* Container principal */}
      <div className="w-full flex flex-col items-center max-w-[340px] relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-700 ease-out">

        {/* TEXTO DO TOPO */}
        <div className="text-center mb-10 w-full px-2">
          <h1 className="text-[28px] leading-[1.1] font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] tracking-tight text-center mb-4">
            Encontre a unidade Açaí<br />
            no Grau mais próxima de<br />
            você! 😋
          </h1>

          {/* SUBTEXTO */}
          <div className="flex flex-col items-center gap-1.5 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-forwards">
            <p className="text-white/90 text-[15px] font-normal leading-tight">
              Para entregas, selecione
            </p>
            <p className="text-white/90 text-[15px] font-normal leading-tight">
              o seu estado:
            </p>
          </div>
        </div>

        {/* CARD DE SELEÇÃO */}
        <div className="w-full bg-white rounded-[24px] shadow-2xl p-6 flex flex-col items-center mb-8">
          {error ? (
            <div className="text-center py-6">
              <p className="text-destructive mb-4">Erro ao carregar estados</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3 w-full">
              <Skeleton className="h-12 w-full rounded-[12px] bg-gray-100" />
              <Skeleton className="h-12 w-full rounded-[12px] bg-gray-100" />
              <Skeleton className="h-12 w-full rounded-[12px] bg-gray-100" />
            </div>
          ) : states.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Nenhuma loja ativa encontrada
            </div>
          ) : (
            <div className="w-full space-y-4">
              {/* SELECT ESTADO */}
              <div className="w-full">
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-full h-12 bg-[#F8F9FA] border border-gray-100 rounded-[14px] px-4 text-[15px] text-gray-700 font-medium focus:ring-0 shadow-sm [&>span]:line-clamp-1 [&>svg]:hidden data-[placeholder]:text-gray-400">
                    <div className="flex w-full items-center justify-between">
                      <SelectValue placeholder="Selecione o Estado" />
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-[14px] border-gray-100 shadow-xl max-h-[300px]">
                    {states.map((code) => (
                      <SelectItem
                        key={code}
                        value={code}
                        className="text-[15px] font-medium text-gray-700 py-3 focus:bg-purple-50 focus:text-[#63489A] cursor-pointer"
                      >
                        {STATE_CODE_TO_NAME[code] || code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col w-full pt-1">
                {/* BOTÃO CONTINUAR */}
                <Button
                  className="w-full h-12 bg-[#63489A] hover:bg-[#523C80] text-white font-bold text-[16px] rounded-[12px] shadow-none mt-1 transition-all duration-300 disabled:opacity-50"
                  onClick={handleContinue}
                  disabled={!selectedState}
                >
                  Continuar
                </Button>

                {/* BOTÃO LOCALIZAÇÃO */}
                <Button
                  variant="ghost"
                  className="w-full h-12 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] font-medium text-[14px] rounded-[12px] mt-4 border-none gap-2"
                  onClick={handleUseLocation}
                >
                  <MapPin className="w-4 h-4 text-[#63489A]" />
                  Usar minha localização
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationState;
