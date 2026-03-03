"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Calendar, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@morelatto/api-client";
import { formatDate, formatPrice } from "@/lib/utils";

export function WorkshopsPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-workshops"],
    queryFn: () => api.getPublicWorkshops(),
  });

  const workshops = data?.slice(0, 3) || [];

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Próximos talleres
            </h2>
            <p className="mt-2 text-muted-foreground">
              Aprendé nuevas técnicas con nuestros talleres presenciales y online
            </p>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex">
            <Link href="/talleres">
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Workshops Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-48 w-full rounded-lg" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workshops.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workshops.map((workshop: any) => (
              <Card key={workshop.id} className="overflow-hidden">
                <CardHeader className="p-0">
                  <div className="relative aspect-video bg-muted">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl">🧶</span>
                    </div>
                    {workshop.is_online && (
                      <Badge className="absolute right-2 top-2" variant="secondary">
                        Online
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2">{workshop.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {workshop.description}
                  </p>
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
                        {workshop.current_participants || 0}/{workshop.max_participants}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t p-4">
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(workshop.price)}
                  </span>
                  <Button size="sm" asChild>
                    <Link href={`/talleres/${workshop.id}`}>Ver más</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-8 text-center">
            <p className="text-muted-foreground">
              No hay talleres programados en este momento.
            </p>
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Button asChild>
            <Link href="/talleres">
              Ver todos los talleres
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
