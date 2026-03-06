"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ShoppingCart, ArrowLeft, Loader2, Package } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useCartStore } from "@/stores/cart-store";
import { api } from "@/lib/api-client";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
}

export default function FavoritosPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { items: favorites, removeFavorite } = useFavoritesStore();
  const { addItem, setIsOpen } = useCartStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/cuenta/favoritos");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleAddToCart = (item: any) => {
    addItem({
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image_url ? api.getImageUrl(item.image_url) || item.image_url : undefined,
    });
    setIsOpen(true);
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-800 text-white py-12">
        <div className="container mx-auto px-4">
          <Link
            href="/cuenta"
            className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mi cuenta
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="h-8 w-8" />
            Mis Favoritos
          </h1>
          <p className="text-amber-100 mt-1">
            {favorites.length} producto{favorites.length !== 1 ? "s" : ""} guardado
            {favorites.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {favorites.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden group"
              >
                {/* Image */}
                <Link href={`/productos/${item.slug || item.id}`}>
                  <div className="relative h-48 bg-gray-100">
                    {item.image_url ? (
                      <Image
                        src={api.getImageUrl(item.image_url) || item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-4">
                  <Link href={`/productos/${item.slug || item.id}`}>
                    <h3 className="font-medium text-gray-900 hover:text-amber-800 transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                  </Link>
                  <p className="text-lg font-bold text-amber-800 mt-2">
                    {formatPrice(item.price)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 bg-amber-800 text-white py-2 px-4 rounded-lg hover:bg-amber-900 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Agregar
                    </button>
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-red-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Heart className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No tenés favoritos
            </h2>
            <p className="text-gray-600 mb-6">
              Guardá productos que te gusten para encontrarlos fácilmente
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
            >
              Explorar productos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
