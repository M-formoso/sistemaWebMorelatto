"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ArrowLeft, Share2 } from "lucide-react";
import { api } from "@/lib/api-client";

export default function NoticiaDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: noticia, isLoading, error } = useQuery({
    queryKey: ["public-news-item", slug],
    queryFn: () => api.getPublicNewsItem(slug),
    enabled: !!slug,
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: noticia?.title,
          text: noticia?.excerpt || noticia?.title,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Enlace copiado al portapapeles");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando noticia...</p>
        </div>
      </div>
    );
  }

  if (error || !noticia) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Noticia no encontrada
          </h1>
          <p className="text-gray-600 mb-6">
            La noticia que buscas no existe o fue eliminada.
          </p>
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a noticias
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero image */}
      {noticia.image_url && (
        <div className="w-full h-64 md:h-96 relative">
          <img
            src={api.getImageUrl(noticia.image_url) || noticia.image_url}
            alt={noticia.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a noticias
          </Link>

          {/* Article */}
          <article className="bg-white rounded-lg shadow-md p-6 md:p-10">
            {/* Meta */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                {noticia.published_at
                  ? format(new Date(noticia.published_at), "d 'de' MMMM 'de' yyyy", {
                      locale: es,
                    })
                  : "Sin fecha"}
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-500 hover:text-amber-800 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-sm">Compartir</span>
              </button>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {noticia.title}
            </h1>

            {/* Excerpt */}
            {noticia.excerpt && (
              <p className="text-lg text-gray-600 mb-8 italic border-l-4 border-amber-800 pl-4">
                {noticia.excerpt}
              </p>
            )}

            {/* Content */}
            {noticia.content && (
              <div className="prose prose-lg max-w-none">
                {noticia.content.split("\n").map((paragraph: string, index: number) => (
                  <p key={index} className="text-gray-700 mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </article>

          {/* CTA */}
          <div className="mt-8 bg-amber-50 rounded-lg p-6 text-center">
            <h3 className="text-xl font-semibold text-amber-900 mb-2">
              Visitanos en nuestra tienda
            </h3>
            <p className="text-amber-800 mb-4">
              Encontra las mejores lanas y todo lo que necesitas para tus proyectos
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
            >
              Ver productos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
