"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Users, Clock, MapPin, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { formatDate, formatPrice } from "@/lib/utils";

export default function TalleresPage() {
  const { data: workshops, isLoading, error } = useQuery({
    queryKey: ["public-workshops"],
    queryFn: () => api.getPublicWorkshops(),
  });

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          Talleres de Tejido
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Aprendé nuevas técnicas con nuestros talleres presenciales y online.
          Desde nivel principiante hasta avanzado, hay un taller para vos.
        </p>
      </div>

      {/* Workshops Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="p-0">
                <Skeleton className="aspect-video w-full" />
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">
            Error al cargar los talleres. Por favor, intentá de nuevo.
          </p>
        </div>
      ) : workshops && workshops.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workshops.map((workshop: any) => {
            const isFull =
              workshop.max_participants &&
              workshop.current_participants >= workshop.max_participants;
            const isPast = new Date(workshop.date) < new Date();

            return (
              <Card key={workshop.id} className="overflow-hidden flex flex-col">
                <CardHeader className="p-0">
                  <div className="relative aspect-video bg-muted">
                    {workshop.images?.[0]?.url ? (
                      <Image
                        src={api.getImageUrl(workshop.images[0].url) || ""}
                        alt={workshop.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-5xl">🧶</span>
                      </div>
                    )}
                    <div className="absolute left-2 top-2 flex gap-2">
                      {workshop.is_online ? (
                        <Badge variant="secondary">
                          <Monitor className="mr-1 h-3 w-3" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <MapPin className="mr-1 h-3 w-3" />
                          Presencial
                        </Badge>
                      )}
                      {isFull && <Badge variant="destructive">Completo</Badge>}
                      {isPast && <Badge variant="secondary">Finalizado</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {workshop.title}
                  </h3>
                  {workshop.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                      {workshop.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(workshop.date)}
                    </div>
                    {workshop.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {workshop.duration}
                      </div>
                    )}
                    {workshop.max_participants && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {workshop.current_participants || 0}/
                        {workshop.max_participants}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t p-4">
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(workshop.price)}
                  </span>
                  <Button
                    asChild
                    disabled={isFull || isPast}
                  >
                    <Link href={`/talleres/${workshop.id}`}>
                      {isFull ? "Completo" : isPast ? "Finalizado" : "Ver detalles"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/50 p-12 text-center">
          <span className="text-5xl">📅</span>
          <p className="mt-4 text-lg font-medium">
            No hay talleres programados en este momento
          </p>
          <p className="mt-2 text-muted-foreground">
            Seguinos en redes sociales para enterarte cuando publiquemos nuevos
            talleres
          </p>
        </div>
      )}
    </div>
  );
}
