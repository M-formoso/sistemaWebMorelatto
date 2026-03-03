"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShoppingCart, Minus, Plus, Heart, Share2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { api } from "@morelatto/api-client";

export default function ProductoPage() {
  const params = useParams();
  const productId = params.id as string;
  const { addItem, setIsOpen } = useCartStore();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getPublicProduct(productId),
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg text-muted-foreground">Producto no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/productos">Volver a productos</Link>
        </Button>
      </div>
    );
  }

  const images = product.images || [];
  const currentImage = images[selectedImageIndex];
  const imageUrl = currentImage ? api.getImageUrl(currentImage.url) : null;

  const variants = product.variants || [];
  const currentVariant = selectedVariant
    ? variants.find((v: any) => v.id === selectedVariant)
    : null;

  const currentPrice = currentVariant?.price || product.price;
  const currentStock = currentVariant?.stock ?? product.stock ?? 0;
  const isOutOfStock = currentStock <= 0;

  const hasDiscount = product.compare_price && product.compare_price > currentPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - currentPrice / product.compare_price) * 100)
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (variants.length > 0 && !selectedVariant) {
      toast({
        title: "Seleccioná una opción",
        description: "Por favor elegí una variante antes de agregar al carrito",
        variant: "destructive",
      });
      return;
    }

    addItem({
      product_id: product.id,
      variant_id: selectedVariant || undefined,
      name: product.name,
      variant_name: currentVariant?.name,
      price: currentPrice,
      quantity,
      image_url: imageUrl || undefined,
      weight: currentVariant?.weight || product.weight,
    });

    toast({
      title: "Producto agregado",
      description: `${product.name} fue agregado al carrito`,
    });

    setIsOpen(true);
  };

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/productos">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver a productos
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <div className="space-y-4">
          {/* Main image */}
          <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-6xl">🧶</span>
              </div>
            )}

            {hasDiscount && (
              <Badge variant="destructive" className="absolute left-4 top-4">
                -{discountPercent}%
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    idx === selectedImageIndex
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/50"
                  }`}
                >
                  <Image
                    src={api.getImageUrl(img.url) || ""}
                    alt={`${product.name} - ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title & Price */}
          <div>
            {product.category && (
              <p className="text-sm text-muted-foreground">{product.category.name}</p>
            )}
            <h1 className="mt-1 font-display text-3xl font-bold">{product.name}</h1>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.compare_price)}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          <Separator />

          {/* Variants */}
          {variants.length > 0 && (
            <div>
              <label className="text-sm font-medium">Opciones:</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((variant: any) => (
                  <Button
                    key={variant.id}
                    variant={selectedVariant === variant.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVariant(variant.id)}
                    disabled={variant.stock <= 0}
                    className="relative"
                  >
                    {variant.name}
                    {variant.stock <= 0 && (
                      <span className="ml-1 text-xs">(sin stock)</span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium">Cantidad:</label>
            <div className="mt-2 flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-lg font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                disabled={quantity >= currentStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentStock > 0 ? `${currentStock} disponibles` : "Sin stock"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={isOutOfStock || (variants.length > 0 && !selectedVariant)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isOutOfStock ? "Sin stock" : "Agregar al carrito"}
            </Button>
            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Shipping info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Envíos a todo el país</p>
                <p className="text-sm text-muted-foreground">
                  Calculá el costo en el checkout
                </p>
              </div>
            </div>
          </div>

          {/* Product details */}
          {(product.code || product.weight) && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {product.code && <p>Código: {product.code}</p>}
              {product.weight && <p>Peso: {product.weight}g</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
