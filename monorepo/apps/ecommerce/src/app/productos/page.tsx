"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { api } from "@/lib/api-client";

function ProductosContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoria");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryId || "all");

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-products", search, selectedCategory],
    queryFn: () =>
      api.getPublicProducts({
        search: search || undefined,
        category_id: selectedCategory !== "all" ? selectedCategory : undefined,
      }),
  });

  const products = data?.items || [];

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          Nuestros productos
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explorá nuestra selección de lanas y accesorios
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          {/* Search */}
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Category filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {products.length} producto{products.length !== 1 ? "s" : ""} encontrado
            {products.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">
            Error al cargar los productos. Por favor, intentá de nuevo.
          </p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/50 p-12 text-center">
          <p className="text-lg font-medium">No se encontraron productos</p>
          <p className="mt-2 text-muted-foreground">
            Probá con otros filtros o términos de búsqueda
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="container py-8">
        <div className="mb-8">
          <div className="h-10 w-64 bg-muted animate-pulse rounded" />
          <div className="mt-2 h-5 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    }>
      <ProductosContent />
    </Suspense>
  );
}
