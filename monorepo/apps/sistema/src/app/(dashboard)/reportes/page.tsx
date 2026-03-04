"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

export default function ReportesPage() {
  const [period, setPeriod] = useState("30");

  const { data: summary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: salesByPeriod } = useQuery({
    queryKey: ["sales-by-period", period],
    queryFn: () => api.getSalesByPeriod(parseInt(period)),
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", period],
    queryFn: () => api.getTopProducts(10, parseInt(period)),
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: () => api.getLowStockProducts(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">
            Analisis y metricas del negocio
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ultimos 7 dias</SelectItem>
            <SelectItem value="30">Ultimos 30 dias</SelectItem>
            <SelectItem value="90">Ultimos 90 dias</SelectItem>
            <SelectItem value="365">Ultimo año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(summary?.total_sales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.sales_count || 0} ventas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos web</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(summary?.total_orders || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.orders_count || 0} pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.products_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.low_stock_count || 0} con bajo stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.clients_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              registrados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Productos mas vendidos
            </CardTitle>
            <CardDescription>
              Top 10 en los ultimos {period} dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Vendidos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product: any, index: number) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantity_sold}</TableCell>
                      <TableCell className="text-right">
                        {formatPrice(product.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay datos de ventas en este periodo
              </p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Productos con bajo stock
            </CardTitle>
            <CardDescription>
              Productos que necesitan reposicion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Minimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.code}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {product.stock}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.stock_min}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Todos los productos tienen stock suficiente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales by period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ventas por periodo
          </CardTitle>
          <CardDescription>
            Resumen de ventas en los ultimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesByPeriod?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Ventas local</TableHead>
                  <TableHead className="text-right">Pedidos web</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesByPeriod.map((day: any) => (
                  <TableRow key={day.date}>
                    <TableCell>
                      {format(new Date(day.date), "dd MMM", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(day.sales_total || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(day.orders_total || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice((day.sales_total || 0) + (day.orders_total || 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay datos de ventas en este periodo
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
