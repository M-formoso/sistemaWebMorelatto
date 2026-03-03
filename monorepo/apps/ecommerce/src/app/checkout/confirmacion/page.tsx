"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold">
          ¡Gracias por tu compra!
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tu pedido fue recibido correctamente y está siendo procesado.
        </p>

        {orderId && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Número de pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xl font-bold text-primary">
                #{orderId.slice(0, 8).toUpperCase()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Guardá este número para hacer seguimiento de tu pedido
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 space-y-4">
          <p className="text-muted-foreground">
            Te enviamos un email con los detalles de tu compra y las
            instrucciones para completar el pago si corresponde.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/mi-cuenta/pedidos">
                Ver mis pedidos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/productos">Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={
      <div className="container py-16">
        <div className="mx-auto max-w-lg text-center">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto mt-6 h-10 w-64" />
          <Skeleton className="mx-auto mt-4 h-6 w-96" />
        </div>
      </div>
    }>
      <ConfirmacionContent />
    </Suspense>
  );
}
