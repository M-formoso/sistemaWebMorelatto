"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@morelatto/api-client";
import { formatPrice } from "@/lib/utils";

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: () => api.getLowStockProducts(),
  });

  const stats = [
    {
      name: "Ventas del mes",
      value: summary?.monthly_sales ? formatPrice(summary.monthly_sales) : "-",
      change: summary?.sales_change || 0,
      icon: DollarSign,
    },
    {
      name: "Pedidos pendientes",
      value: summary?.pending_orders || 0,
      icon: ShoppingCart,
    },
    {
      name: "Productos activos",
      value: summary?.active_products || 0,
      icon: Package,
    },
    {
      name: "Clientes registrados",
      value: summary?.total_customers || 0,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general del negocio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change !== undefined && stat.change !== 0 && (
                <p className={`flex items-center text-xs ${stat.change > 0 ? "text-green-600" : "text-red-600"}`}>
                  {stat.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(stat.change)}% vs mes anterior
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Productos con bajo stock
            </CardTitle>
            <CardDescription>
              Productos que necesitan reposición
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <div className="space-y-3">
                {lowStock.slice(0, 5).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Código: {product.code || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {product.stock}
                      </p>
                      <p className="text-xs text-muted-foreground">unidades</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No hay productos con bajo stock
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos recientes</CardTitle>
            <CardDescription>
              Últimos pedidos de la tienda online
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.recent_orders && summary.recent_orders.length > 0 ? (
              <div className="space-y-3">
                {summary.recent_orders.slice(0, 5).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(order.total)}</p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay pedidos recientes</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
