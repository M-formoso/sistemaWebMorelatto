"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Loader2, Package, Truck, User, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { useState } from "react";

export default function PedidoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orderId = params.id as string;

  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: !!orderId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Estado actualizado" });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: (status: string) => api.updatePaymentStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast({ title: "Estado de pago actualizado" });
    },
  });

  const updateShipmentMutation = useMutation({
    mutationFn: (data: { tracking_number?: string; carrier?: string; status?: string }) =>
      api.updateShipment(order?.shipment?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      toast({ title: "Informacion de envio actualizada" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p>Pedido no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/pedidos">Volver a pedidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pedidos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Pedido #{order.order_number || order.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              {order.created_at &&
                format(new Date(order.created_at), "dd MMMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={order.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="processing">Preparando</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="delivered">Entregado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Order items */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <div className="relative h-16 w-16 rounded-md bg-muted overflow-hidden">
                      {item.product?.images?.[0]?.image_url ? (
                        <Image
                          src={api.getImageUrl(item.product.images[0].image_url) || ""}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">🧶</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x {formatPrice(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-medium">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Envio</span>
                  <span>{formatPrice(order.shipping_cost)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Informacion de envio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Numero de seguimiento</Label>
                  <Input
                    value={trackingNumber || order.shipment?.tracking_number || ""}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Ej: OCA123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transportista</Label>
                  <Input
                    value={carrier || order.shipment?.carrier || ""}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="Ej: OCA, Correo Argentino"
                  />
                </div>
              </div>
              {order.shipment && (
                <Button
                  onClick={() =>
                    updateShipmentMutation.mutate({
                      tracking_number: trackingNumber || undefined,
                      carrier: carrier || undefined,
                    })
                  }
                  disabled={updateShipmentMutation.isPending}
                >
                  Actualizar envio
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">{order.customer_email}</p>
              {order.customer_phone && (
                <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Shipping address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Direccion de envio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{order.shipping_address?.street}</p>
              <p>
                {order.shipping_address?.city}, {order.shipping_address?.province}
              </p>
              <p>{order.shipping_address?.postal_code}</p>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                <Badge
                  variant={order.payment_status === "paid" ? "default" : "secondary"}
                >
                  {order.payment_status === "paid" ? "Pagado" : "Pendiente"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Metodo:</span>
                <span className="text-sm">{order.payment_method || "MercadoPago"}</span>
              </div>
              <Select
                value={order.payment_status}
                onValueChange={(value) => updatePaymentMutation.mutate(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
