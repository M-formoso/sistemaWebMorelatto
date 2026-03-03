"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";

export function CategoriesSection() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  return (
    <section className="bg-morelatto-cream/30 py-16 md:py-24">
      <div className="container">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Explorá por categoría
          </h2>
          <p className="mt-2 text-muted-foreground">
            Encontrá exactamente lo que estás buscando
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : categories?.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category: any) => (
              <Link
                key={category.id}
                href={`/productos?categoria=${category.id}`}
                className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <span className="text-xl">🧶</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.product_count > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {category.product_count} productos
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-8 text-center">
            <p className="text-muted-foreground">
              No hay categorías disponibles aún.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
