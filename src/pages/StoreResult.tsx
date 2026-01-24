import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/BottomNavigation";
import { formatDistance } from "@/utils/distance";

const StoreResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { store, distance, deliveryTime } = location.state || {};

  const formattedDistance = distance ? formatDistance(distance) : "a poucos quilômetros";
  
  // Calcular tempo mínimo e máximo (±10% do tempo estimado)
  const minTime = deliveryTime ? Math.round(deliveryTime * 0.9) : 15;
  const maxTime = deliveryTime ? Math.round(deliveryTime * 1.1) : 20;

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

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl mb-6">
              A loja mais próxima fica a
              <br />
              <span className="text-primary font-bold text-4xl">{formattedDistance}</span> de você!
            </h1>
            {store && (
              <p className="text-lg mb-2">
                <span className="font-bold">{store.name}</span>
              </p>
            )}
            <p className="text-lg">
              Seu pedido chegará entre
              <br />
              <span className="font-bold text-xl">{minTime} a {maxTime} minutos.</span>
            </p>
          </div>

          <Button
            onClick={() => navigate("/stores", { state: { store, distance } })}
            className="w-full bg-card hover:bg-card/80 text-foreground shadow-card rounded-2xl p-6 h-auto flex items-center gap-4 justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-2xl">🍓</span>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Acesse o cardápio exclusivo!</h3>
                <p className="text-sm text-muted-foreground">E aproveite nossas promoções!</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-success flex-shrink-0" />
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default StoreResult;
