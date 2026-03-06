"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800", icon: Package },
  preparing: { label: "Preparando", color: "bg-purple-100 text-purple-800", icon: Package },
  shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-800", icon: Truck },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: XCircle },
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(price);
}

function OrderCard({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-full ${status.color}`}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Pedido #{order.order_number || order.id.slice(0, 8)}
              </p>
              <p className="text-sm text-gray-500">
                {order.created_at
                  ? format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })
                  : "Sin fecha"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
              <span className={`text-sm px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Productos</h4>
            <div className="space-y-2">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.product?.name || "Producto"}</p>
                    <p className="text-sm text-gray-500">
                      Cantidad: {item.quantity} x {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-medium">{formatPrice(item.quantity * item.price)}</p>
                </div>
              ))}
            </div>
          </div>

          {order.shipment?.tracking_number && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Número de seguimiento: {order.shipment.tracking_number}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MisPedidosPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.getMyOrders(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/cuenta/pedidos");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800" />
      </div>
    );
  }

  const orderList = orders || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-800 text-white py-12">
        <div className="container mx-auto px-4">
          <Link
            href="/cuenta"
            className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mi cuenta
          </Link>
          <h1 className="text-3xl font-bold">Mis Pedidos</h1>
          <p className="text-amber-100 mt-1">Historial de compras</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-amber-800 mx-auto" />
            <p className="mt-4 text-gray-600">Cargando pedidos...</p>
          </div>
        ) : orderList.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-4">
            {orderList.map((order: any) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-amber-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Package className="h-12 w-12 text-amber-800" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No tenés pedidos aún
            </h2>
            <p className="text-gray-600 mb-6">
              Cuando realices tu primera compra, aparecerá aquí.
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
            >
              Ver productos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
