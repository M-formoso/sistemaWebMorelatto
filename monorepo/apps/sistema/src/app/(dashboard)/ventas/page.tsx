"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Search, Eye, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

interface SaleItem {
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export default function VentasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [searchProduct, setSearchProduct] = useState("");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => api.getSales(),
  });

  const { data: summary } = useQuery({
    queryKey: ["sales-summary"],
    queryFn: () => api.getSalesSummary(),
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.getClients(),
  });

  const { data: products } = useQuery({
    queryKey: ["products-search", searchProduct],
    queryFn: () => api.getProducts({ search: searchProduct || undefined }),
    enabled: showDialog,
  });

  const createSaleMutation = useMutation({
    mutationFn: (data: any) => api.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Venta registrada" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedClient("");
    setPaymentMethod("cash");
    setItems([]);
    setSearchProduct("");
  };

  const addItem = (product: any) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
            : i
        )
      );
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: parseFloat(product.price),
          subtotal: parseFloat(product.price),
        },
      ]);
    }
    setSearchProduct("");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter((i) => i.product_id !== productId));
    } else {
      setItems(
        items.map((i) =>
          i.product_id === productId
            ? { ...i, quantity, subtotal: quantity * i.unit_price }
            : i
        )
      );
    }
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      toast({ title: "Agrega al menos un producto", variant: "destructive" });
      return;
    }

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);

    createSaleMutation.mutate({
      client_id: selectedClient || null,
      payment_method: paymentMethod,
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      total,
    });
  };

  const saleList = sales || [];
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  const productList = products?.items || products || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ventas Local</h1>
          <p className="text-muted-foreground">
            Registra ventas en el local fisico
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva venta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas hoy</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(summary?.today_total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.today_count || 0} ventas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(summary?.week_total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.week_count || 0} ventas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(summary?.month_total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.month_count || 0} ventas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando ventas...
            </div>
          ) : saleList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleList.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-sm">
                      {sale.created_at
                        ? format(new Date(sale.created_at), "dd/MM/yy HH:mm", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>{sale.client?.name || "Sin cliente"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sale.items?.length || 0} items
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sale.payment_method === "cash"
                          ? "Efectivo"
                          : sale.payment_method === "card"
                          ? "Tarjeta"
                          : sale.payment_method === "transfer"
                          ? "Transferencia"
                          : sale.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(sale.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No hay ventas registradas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nueva venta dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin cliente</SelectItem>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metodo de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search products */}
            <div className="space-y-2">
              <Label>Agregar productos</Label>
              <Input
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Buscar por nombre o codigo..."
              />
              {searchProduct && productList.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {productList.slice(0, 5).map((product: any) => (
                    <div
                      key={product.id}
                      className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                      onClick={() => addItem(product)}
                    >
                      <span>{product.name}</span>
                      <span className="text-sm font-medium">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[100px]">Cantidad</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.product_id, parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-bold">
                        Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {formatPrice(total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createSaleMutation.isPending || items.length === 0}
            >
              Registrar venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
