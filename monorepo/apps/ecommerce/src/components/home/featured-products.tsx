"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { api } from "@morelatto/api-client";

export function FeaturedProducts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => api.getPublicProducts({ limit: 8 }),
  });

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Productos destacados
            </h2>
            <p className="mt-2 text-muted-foreground">
              Descubrí nuestras lanas más populares
            </p>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex">
            <Link href="/productos">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
            <p className="text-destructive">
              Error al cargar los productos. Por favor, intentá de nuevo.
            </p>
          </div>
        ) : data?.items?.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.slice(0, 8).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-8 text-center">
            <p className="text-muted-foreground">
              No hay productos disponibles en este momento.
            </p>
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Button asChild>
            <Link href="/productos">
              Ver todos los productos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
