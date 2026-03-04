"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  MapPin,
  CreditCard,
} from "lucide-react";
import { api } from "@/lib/api-client";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800", icon: Package },
  preparing: { label: "Preparando", color: "bg-purple-100 text-purple-800", icon: Package },
  shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-800", icon: Truck },
  delivered: { label: "Entregado", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: XCircle },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "text-yellow-600" },
  paid: { label: "Pagado", color: "text-green-600" },
  failed: { label: "Fallido", color: "text-red-600" },
  refunded: { label: "Reembolsado", color: "text-gray-600" },
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
  const paymentStatus = paymentStatusConfig[order.payment_status] || paymentStatusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
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
                  ? format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", {
                      locale: es,
                    })
                  : "Sin fecha"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900">{formatPrice(order.total)}</p>
              <span className={`text-sm ${paymentStatus.color}`}>
                {paymentStatus.label}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t p-4 space-y-4">
          {/* Items */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Productos
            </h4>
            <div className="space-y-2">
              {order.items?.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {item.product?.primary_image_url ? (
                      <img
                        src={api.getImageUrl(item.product.primary_image_url) || item.product.primary_image_url}
                        alt={item.product?.name || "Producto"}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product?.name || "Producto"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Cantidad: {item.quantity} x {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatPrice(item.quantity * item.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping info */}
          {order.shipping_address && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Direccion de envio
              </h4>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p>{order.shipping_address.street}</p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.province}
                </p>
                <p>CP: {order.shipping_address.postal_code}</p>
              </div>
            </div>
          )}

          {/* Payment info */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detalle del pago
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotal || order.total - (order.shipping_cost || 0))}</span>
              </div>
              {order.shipping_cost > 0 && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Envio</span>
                  <span>{formatPrice(order.shipping_cost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          {order.shipment?.tracking_number && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Numero de seguimiento: {order.shipment.tracking_number}
              </p>
              {order.shipment.carrier && (
                <p className="text-sm text-blue-700">
                  Transportadora: {order.shipment.carrier}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MisPedidosPage() {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.getMyOrders(),
  });

  const orderList = orders || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-amber-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Mis Pedidos</h1>
          <p className="text-amber-100">
            Revisa el estado y detalle de tus compras
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando pedidos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="bg-red-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Error al cargar pedidos
            </h2>
            <p className="text-gray-600 mb-6">
              No pudimos cargar tus pedidos. Intenta nuevamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
            >
              Reintentar
            </button>
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
              No tenes pedidos aun
            </h2>
            <p className="text-gray-600 mb-6">
              Cuando realices tu primera compra, podras ver el estado aqui.
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
            >
              <ShoppingBag className="h-5 w-5" />
              Ver productos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
