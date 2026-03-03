"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  Monitor,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatDate, formatPrice } from "@/lib/utils";

export default function TallerPage() {
  const params = useParams();
  const workshopId = params.id as string;
  const { toast } = useToast();

  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollData, setEnrollData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const { data: workshop, isLoading, error } = useQuery({
    queryKey: ["workshop", workshopId],
    queryFn: () => api.getPublicWorkshop(workshopId),
    enabled: !!workshopId,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      return api.enrollInWorkshop({
        workshop_id: workshopId,
        participant_name: enrollData.name,
        participant_email: enrollData.email,
        participant_phone: enrollData.phone,
      });
    },
    onSuccess: () => {
      toast({
        title: "¡Inscripción exitosa!",
        description:
          "Te enviamos un email con los detalles para completar tu inscripción.",
      });
      setEnrollDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al inscribirse",
        description: error.message || "Por favor, intentá de nuevo",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-6 w-32 mb-8" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="container py-16 text-center">
        <p className="text-lg text-muted-foreground">Taller no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/talleres">Volver a talleres</Link>
        </Button>
      </div>
    );
  }

  const isFull =
    workshop.max_participants &&
    workshop.current_participants >= workshop.max_participants;
  const isPast = new Date(workshop.date) < new Date();
  const canEnroll = !isFull && !isPast;

  const images = workshop.images || [];
  const mainImage = images[0]?.url ? api.getImageUrl(images[0].url) : null;

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/talleres">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Volver a talleres
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={workshop.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-6xl">🧶</span>
              </div>
            )}
            <div className="absolute left-4 top-4 flex gap-2">
              {workshop.is_online ? (
                <Badge variant="secondary" className="text-sm">
                  <Monitor className="mr-1 h-4 w-4" />
                  Online
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-sm">
                  <MapPin className="mr-1 h-4 w-4" />
                  Presencial
                </Badge>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">
              {workshop.title}
            </h1>
            {workshop.instructor && (
              <p className="mt-2 text-lg text-muted-foreground">
                Dictado por: <span className="font-medium">{workshop.instructor}</span>
              </p>
            )}
          </div>

          {/* Description */}
          {workshop.description && (
            <div className="prose prose-neutral max-w-none">
              <p className="text-muted-foreground whitespace-pre-line">
                {workshop.description}
              </p>
            </div>
          )}

          {/* What you'll learn */}
          {workshop.topics && workshop.topics.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">¿Qué vas a aprender?</h2>
              <ul className="space-y-2">
                {workshop.topics.map((topic: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Materials included */}
          {workshop.materials_included && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Materiales incluidos</h2>
              <p className="text-muted-foreground">{workshop.materials_included}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">
                {formatPrice(workshop.price)}
              </CardTitle>
              <CardDescription>por persona</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(workshop.date)}</p>
                    {workshop.time && (
                      <p className="text-muted-foreground">{workshop.time}</p>
                    )}
                  </div>
                </div>

                {workshop.duration && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>{workshop.duration}</span>
                  </div>
                )}

                {workshop.max_participants && (
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>
                      {workshop.current_participants || 0} /{" "}
                      {workshop.max_participants} inscriptos
                    </span>
                  </div>
                )}

                {!workshop.is_online && workshop.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{workshop.location}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* CTA */}
              {canEnroll ? (
                <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      Inscribirme
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inscripción al taller</DialogTitle>
                      <DialogDescription>
                        Completá tus datos para inscribirte a "{workshop.title}"
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre completo</Label>
                        <Input
                          id="name"
                          value={enrollData.name}
                          onChange={(e) =>
                            setEnrollData({ ...enrollData, name: e.target.value })
                          }
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={enrollData.email}
                          onChange={(e) =>
                            setEnrollData({ ...enrollData, email: e.target.value })
                          }
                          placeholder="tu@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={enrollData.phone}
                          onChange={(e) =>
                            setEnrollData({ ...enrollData, phone: e.target.value })
                          }
                          placeholder="+54 11 1234-5678"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => enrollMutation.mutate()}
                        disabled={
                          enrollMutation.isPending ||
                          !enrollData.name ||
                          !enrollData.email
                        }
                      >
                        {enrollMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          `Confirmar inscripción - ${formatPrice(workshop.price)}`
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button className="w-full" size="lg" disabled>
                  {isFull ? "Cupo completo" : "Taller finalizado"}
                </Button>
              )}

              {workshop.max_participants && canEnroll && (
                <p className="text-center text-sm text-muted-foreground">
                  Solo quedan{" "}
                  {workshop.max_participants - (workshop.current_participants || 0)}{" "}
                  lugares
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
