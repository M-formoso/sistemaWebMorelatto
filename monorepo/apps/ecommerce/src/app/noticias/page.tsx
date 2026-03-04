"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";

export default function NoticiasPage() {
  const { data: news, isLoading } = useQuery({
    queryKey: ["public-news"],
    queryFn: () => api.getPublicNews(),
  });

  const newsList = news || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-amber-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Noticias y Novedades</h1>
          <p className="text-amber-100 max-w-2xl mx-auto">
            Enterate de las ultimas novedades, nuevos productos, talleres y todo lo relacionado con el mundo de las lanas
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando noticias...</p>
          </div>
        ) : newsList.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {newsList.map((item: any) => (
              <article
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {item.image_url ? (
                  <Link href={`/noticias/${item.slug || item.id}`}>
                    <img
                      src={api.getImageUrl(item.image_url) || item.image_url}
                      alt={item.title}
                      className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <span className="text-amber-800 text-4xl font-bold">M</span>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Calendar className="h-4 w-4" />
                    {item.published_at
                      ? format(new Date(item.published_at), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })
                      : "Sin fecha"}
                  </div>

                  <Link href={`/noticias/${item.slug || item.id}`}>
                    <h2 className="text-xl font-semibold text-gray-900 hover:text-amber-800 transition-colors mb-3">
                      {item.title}
                    </h2>
                  </Link>

                  {item.excerpt && (
                    <p className="text-gray-600 mb-4 line-clamp-3">{item.excerpt}</p>
                  )}

                  <Link
                    href={`/noticias/${item.slug || item.id}`}
                    className="inline-flex items-center gap-2 text-amber-800 font-medium hover:text-amber-900 transition-colors"
                  >
                    Leer mas
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-amber-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-amber-800" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No hay noticias disponibles
            </h2>
            <p className="text-gray-600">
              Pronto publicaremos novedades. Vuelve a visitarnos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
