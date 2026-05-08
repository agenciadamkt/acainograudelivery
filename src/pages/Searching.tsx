import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/BottomNavigation";
import { useNearbyStores } from "@/hooks/useNearbyStores";
import type { Coordinates } from "@/hooks/useGeolocation";
import { BrandedLoader } from "@/components/ui/branded-loader";

const Searching = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  // Carregar dados do localStorage
  useEffect(() => {
    const savedCity = localStorage.getItem("selectedCity");
    const savedState = localStorage.getItem("selectedState");
    const savedCoords = localStorage.getItem("userCoordinates");

    if (savedCity) setCity(savedCity);
    if (savedState) setState(savedState);
    if (savedCoords) {
      try {
        setCoordinates(JSON.parse(savedCoords));
      } catch (e) {
        // Ignorar erro de parsing
      }
    }
  }, []);

  const { data: stores, isLoading } = useNearbyStores({
    city,
    state,
    coordinates,
  });

  useEffect(() => {
    if (!isLoading && stores && stores.length > 0) {
      // Aguardar animação de 2.5s e redirecionar
      const timer = setTimeout(() => {
        const closestStore = stores[0];
        navigate("/store-result", {
          state: {
            store: closestStore,
            distance: closestStore.distance,
            deliveryTime: closestStore.deliveryTime,
            userLocation: coordinates,
          },
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, stores, navigate, coordinates]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
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

        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <h1 className="text-2xl mb-8">
              <span className="text-primary font-bold">Procurando loja</span>
              <br />
              <span className="font-bold">mais próxima de você</span> em
              <br />
              <span className="text-primary font-bold">{city || "sua cidade"}</span>
            </h1>

            <BrandedLoader 
              label={isLoading ? "Buscando lojas disponíveis..." : "Lojas encontradas!"} 
              minHeight="200px" 
            />
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Searching;
