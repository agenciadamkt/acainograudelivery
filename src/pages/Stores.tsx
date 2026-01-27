import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu, MapPin, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNavigation from "@/components/BottomNavigation";
import logoAcai from "@/assets/logo-acai.png";
import logoWhite from "@/assets/logo-white.png";
import logoOutline from "@/assets/logo-outline.png";
import { useStoresByCity } from "@/hooks/useStoresByCity";
import { formatDistance } from "@/utils/distance";
import type { Coordinates } from "@/hooks/useGeolocation";

const Stores = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  useEffect(() => {
    const savedCity = localStorage.getItem("selectedCity");
    const savedCoords = localStorage.getItem("userCoordinates");

    if (savedCity) setCity(savedCity);
    if (savedCoords) {
      try {
        setCoordinates(JSON.parse(savedCoords));
      } catch (e) {
        // Ignorar erro
      }
    }
  }, []);

  const { data: stores = [], isLoading } = useStoresByCity(city, coordinates);

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

        <Card className="bg-card rounded-3xl p-6 mb-8 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <img src={logoOutline} alt="Açaí no Grau" className="w-20 h-20 object-contain" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Lojas oficiais</h3>
              <p className="text-muted-foreground">
                {isLoading ? "Carregando..." : `${stores.length} encontradas`}
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </>
          ) : stores.length === 0 ? (
            <Card className="bg-card rounded-2xl p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Nenhuma loja encontrada em {city}
              </p>
              <Button onClick={() => navigate("/location-state")} variant="outline">
                Buscar em Outra Cidade
              </Button>
            </Card>
          ) : (
            stores.map((store) => (
              <Card
                key={store.id}
                onClick={() => navigate(`/delivery/${store.slug}`)}
                className="bg-card rounded-2xl p-4 shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#6854AB' }}>
                    <img
                      src={logoWhite}
                      alt="Açaí no Grau"
                      className="w-[85%] h-[85%] object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold">{store.name}</h3>
                      {store.isOpen ? (
                        <span className="flex items-center gap-1 text-success text-sm font-semibold">
                          <span className="w-2 h-2 bg-success rounded-full"></span>
                          ABERTA
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive text-sm font-semibold">
                          <span className="w-2 h-2 bg-destructive rounded-full"></span>
                          FECHADA
                        </span>
                      )}
                    </div>
                    {store.address && (
                      <p className="text-sm text-foreground mb-1">{store.address}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-3">
                      {store.city}, {store.state}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {store.distance !== undefined && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {formatDistance(store.distance)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current text-yellow-500" />
                        4.8
                      </span>
                      {store.estimatedTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {store.estimatedTime} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Stores;
