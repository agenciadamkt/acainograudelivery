import { Home, Heart, User, Clock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useCart } from "@/contexts/CartContext";
import { useMemo } from "react";

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stopSound } = useNotificationSound();
  const { getStoreAwareRoute } = useCart();

  const navItems = useMemo(() => [
    { icon: Home, path: getStoreAwareRoute(), label: "Início" },
    { icon: Heart, path: "/favorites", label: "Favoritos" },
    { icon: Clock, path: "/orders", label: "Pedidos" },
    { icon: User, path: "/profile", label: "Perfil" },
  ], [getStoreAwareRoute, location.pathname]);

  const handleNavigate = (path: string) => {
    if (path === '/orders') {
      stopSound();
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[24px] shadow-2xl z-50 px-6 py-3">
      <div className="flex items-center justify-between">
        {navItems.map(({ icon: Icon, path, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? "flex-[1.5]" : "flex-1"
                }`}
            >
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 ${isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-gray-400 hover:text-primary"
                }`}>
                <Icon className={`w-5 h-5`} />
                {isActive && <span className="text-xs font-bold whitespace-nowrap">{label}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
