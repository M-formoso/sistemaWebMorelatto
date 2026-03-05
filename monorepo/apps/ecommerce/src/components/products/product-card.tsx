"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/stores/cart-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    code?: string;
    price: number;
    compare_price?: number;
    images?: Array<{ url?: string; image_url?: string; is_primary?: boolean }>;
    image_url?: string;
    category?: { name: string };
    stock?: number;
    stock_quantity?: number;
    weight?: number;
    variants?: Array<any>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, setIsOpen } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const productIsFavorite = isFavorite(product.id);

  // Get primary image - support both url and image_url fields
  const getPrimaryImageUrl = () => {
    const primaryImg = product.images?.find((img) => img.is_primary);
    if (primaryImg) return primaryImg.url || primaryImg.image_url;
    const firstImg = product.images?.[0];
    if (firstImg) return firstImg.url || firstImg.image_url;
    return product.image_url;
  };

  const primaryImage = getPrimaryImageUrl();
  const imageUrl = primaryImage ? api.getImageUrl(primaryImage) : null;

  const hasDiscount = product.compare_price && product.compare_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compare_price!) * 100)
    : 0;

  // Support both stock and stock_quantity fields
  const stockValue = product.stock ?? product.stock_quantity;
  const isOutOfStock = stockValue !== undefined && stockValue <= 0;
  const hasVariants = product.variants && product.variants.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    // Si tiene variantes, redirigir al producto
    if (hasVariants) {
      window.location.href = `/productos/${product.id}`;
      return;
    }

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: imageUrl || undefined,
      weight: product.weight,
    });

    toast({
      title: "Producto agregado",
      description: `${product.name} fue agregado al carrito`,
    });

    setIsOpen(true);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: "Iniciá sesión",
        description: "Debés iniciar sesión para guardar favoritos",
      });
      window.location.href = "/login?redirect=/productos";
      return;
    }

    toggleFavorite({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: primaryImage || undefined,
      slug: product.id,
    });

    toast({
      title: productIsFavorite ? "Eliminado de favoritos" : "Agregado a favoritos",
      description: productIsFavorite
        ? `${product.name} fue eliminado de tus favoritos`
        : `${product.name} fue agregado a tus favoritos`,
    });
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/productos/${product.id}`}>
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-4xl">🧶</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-2 top-2 flex flex-col gap-1">
              {hasDiscount && (
                <Badge variant="destructive">-{discountPercent}%</Badge>
              )}
              {isOutOfStock && (
                <Badge variant="secondary">Sin stock</Badge>
              )}
            </div>

            {/* Quick actions */}
            <div className="absolute right-2 top-2 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                className={cn(
                  "h-8 w-8 rounded-full",
                  productIsFavorite && "bg-red-100 text-red-600 hover:bg-red-200"
                )}
                onClick={handleToggleFavorite}
              >
                <Heart className={cn("h-4 w-4", productIsFavorite && "fill-current")} />
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            {product.category && (
              <p className="text-xs text-muted-foreground">
                {product.category.name}
              </p>
            )}
            <h3 className="mt-1 font-medium line-clamp-2">{product.name}</h3>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compare_price!)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Link>

      <CardFooter className="border-t p-4">
        <Button
          className="w-full"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isOutOfStock
            ? "Sin stock"
            : hasVariants
            ? "Ver opciones"
            : "Agregar al carrito"}
        </Button>
      </CardFooter>
    </Card>
  );
}
