import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartDrawer } from "@/components/CartDrawer";
import { useStoreBySlug } from "@/hooks/useStores";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";

export default function Categories() {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const { data: store, isLoading: loadingStore } = useStoreBySlug(slug as string);
    const { data: categories, isLoading: loadingCategories } = useCategories(true, store?.id, { excludePdvOnly: true });

    if (loadingStore || loadingCategories) {
        return (
            <div className="min-h-screen bg-background p-6">
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>
                <Skeleton className="h-8 w-48 mb-8" />
                <div className="grid grid-cols-3 gap-x-4 gap-y-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-3">
                            <Skeleton className="w-24 h-24 rounded-2xl" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!store) return null;

    return (
        <div className="min-h-screen bg-background pb-8">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 pb-2 safe-area-top" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}>
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full bg-white shadow-sm border border-gray-100 h-10 w-10"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="bg-white shadow-sm border border-gray-100 rounded-full h-10 w-10">
                            <Search className="w-5 h-5 text-gray-500" />
                        </Button>
                        <CartDrawer />
                    </div>
                </div>

                <h1 className="text-xl font-bold text-[#2D2D2D]">Todas as categorias</h1>
            </div>

            {/* Grid */}
            <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-x-4 gap-y-8">
                    {categories?.filter(cat => cat.store_id === store.id).map((category) => (
                        <button
                            key={category.id}
                            onClick={() => navigate(`/delivery/${slug}?category=${category.id}`)}
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className="w-24 h-24 relative flex items-center justify-center">
                                {/* Background card similar to StoreMenu but simpler or same style? 
                    The image shows icons/images popping out. 
                    Let's use a similar style (white card background behind) if desired, 
                    or just the image if they are transparent PNGs like in the mock.
                    The mock shows strictly images without a visible box border. 
                    Let's assume the images are self-contained or we use a transparent container. 
                */}
                                {category.image_url ? (
                                    <img
                                        src={category.image_url}
                                        alt={category.name}
                                        className="w-full h-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                                        <span className="text-4xl">{category.icon || '🍨'}</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-xs font-bold text-center text-gray-500 leading-tight group-hover:text-[#6E3696] transition-colors">
                                {category.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
