import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNavigation from "@/components/BottomNavigation";
import { useActiveCities } from "@/hooks/useActiveCities";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getAddressByCEP, getAddressByCoordinates } from "@/utils/geocoding";
import { toast } from "sonner";

/**
 * Mapeamento de siglas para nomes completos (para exibição)
 */
const STATE_CODE_TO_NAME: Record<string, string> = {
  'AC': 'Acre',
  'AL': 'Alagoas',
  'AP': 'Amapá',
  'AM': 'Amazonas',
  'BA': 'Bahia',
  'CE': 'Ceará',
  'DF': 'Distrito Federal',
  'ES': 'Espírito Santo',
  'GO': 'Goiás',
  'MA': 'Maranhão',
  'MT': 'Mato Grosso',
  'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais',
  'PA': 'Pará',
  'PB': 'Paraíba',
  'PR': 'Paraná',
  'PE': 'Pernambuco',
  'PI': 'Piauí',
  'RJ': 'Rio de Janeiro',
  'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia',
  'RR': 'Roraima',
  'SC': 'Santa Catarina',
  'SP': 'São Paulo',
  'SE': 'Sergipe',
  'TO': 'Tocantins'
};

const LocationCity = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const useLocation = searchParams.get("useLocation") === "true";

  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [cep, setCep] = useState("");
  const [number, setNumber] = useState("");
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);

  const { data: cities = [], isLoading, refetch } = useActiveCities(state);
  const { getCurrentLocation, isLoading: isLoadingGeo } = useGeolocation();

  useEffect(() => {
    const savedState = localStorage.getItem("selectedState");
    if (savedState) {
      setState(savedState);
    }
  }, []);

  useEffect(() => {
    if (useLocation) {
      handleGeolocation();
    }
  }, [useLocation]);

  const handleGeolocation = async () => {
    try {
      const coords = await getCurrentLocation();
      const address = await getAddressByCoordinates(coords.latitude, coords.longitude);

      if (address) {
        setState(address.state);
        setCity(address.city);
        if (address.postcode) {
          setCep(address.postcode);
        }

        localStorage.setItem("userCoordinates", JSON.stringify(coords));
        toast.success("Localização obtida com sucesso!");
      }
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleCEPChange = async (value: string) => {
    const cleanCEP = value.replace(/\D/g, "");

    // Formatar CEP
    let formatted = cleanCEP;
    if (cleanCEP.length > 5) {
      formatted = `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5, 8)}`;
    }
    setCep(formatted);

    // Buscar endereço quando CEP completo
    if (cleanCEP.length === 8) {
      setIsLoadingCEP(true);
      try {
        const address = await getAddressByCEP(cleanCEP);
        if (address) {
          console.log("[LocationCity] CEP encontrado:", address);
          setState(address.state);
          setCity(address.city);

          // Forçar refetch após atualizar estado
          setTimeout(() => {
            refetch();
          }, 100);

          toast.success(`Endereço: ${address.city} - ${address.state}`);
        } else {
          toast.error("CEP não encontrado");
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      } finally {
        setIsLoadingCEP(false);
      }
    }
  };

  const handleSubmit = () => {
    if (!city || !cep || !number) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    localStorage.setItem("selectedCity", city);
    localStorage.setItem("selectedState", state);
    localStorage.setItem("userCEP", cep);
    localStorage.setItem("userNumber", number);

    navigate("/searching");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}>
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Menu className="w-6 h-6" />
          </Button>
        </div>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl mb-2">
              <span className="text-primary font-bold">Estamos quase lá...</span>
            </h1>
            <p className="text-lg">
              Agora, selecione a <span className="font-bold">sua cidade</span>:
            </p>
            {state && (
              <p className="text-sm text-muted-foreground mt-2">
                Estado: <span className="font-bold">{STATE_CODE_TO_NAME[state] || state}</span> •
                {cities.length} {cities.length === 1 ? 'cidade' : 'cidades'} {cities.length === 1 ? 'encontrada' : 'encontradas'}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {isLoading || isLoadingGeo ? (
              <>
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </>
            ) : (
              <>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="w-full h-14 text-lg bg-card border-none rounded-xl shadow-card">
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {cities.length === 0 && state ? (
                      <SelectItem value="no-cities" disabled>
                        Nenhuma cidade encontrada para {STATE_CODE_TO_NAME[state] || state}
                      </SelectItem>
                    ) : cities.length === 0 ? (
                      <SelectItem value="no-state" disabled>
                        Digite um CEP ou volte para escolher o estado
                      </SelectItem>
                    ) : (
                      cities.map((cityName) => (
                        <SelectItem key={cityName} value={cityName}>
                          {cityName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    placeholder="CEP"
                    value={cep}
                    onChange={(e) => handleCEPChange(e.target.value)}
                    maxLength={9}
                    className="w-full h-14 text-lg bg-card border-none rounded-xl shadow-card pr-10"
                  />
                  {isLoadingCEP && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
                  )}
                </div>

                <Input
                  placeholder="Número"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full h-14 text-lg bg-card border-none rounded-xl shadow-card"
                />

                <Button
                  onClick={handleSubmit}
                  disabled={!cep || !number || !city}
                  className="w-full h-14 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 mt-8"
                >
                  Buscar Lojas
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/location-state')}
                  className="w-full h-14 text-lg rounded-full"
                >
                  Escolher outro estado
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default LocationCity;
