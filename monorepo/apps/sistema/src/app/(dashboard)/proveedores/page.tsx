"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Search, Edit2, Trash2, Loader2, Building2, DollarSign, FileText } from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

interface SupplierForm {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  cuit: string;
  notes: string;
}

const defaultForm: SupplierForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  cuit: "",
  notes: "",
};

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(defaultForm);
  const [activeTab, setActiveTab] = useState("suppliers");

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => api.getSuppliers({ search: search || undefined }),
  });

  const { data: purchases } = useQuery({
    queryKey: ["supplier-purchases"],
    queryFn: () => api.getSupplierPurchases(),
    enabled: activeTab === "purchases",
  });

  const { data: summary } = useQuery({
    queryKey: ["suppliers-summary"],
    queryFn: () => api.getSuppliersSummary(),
  });

  const createMutation = useMutation({
    mutationFn: (data: SupplierForm) => api.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Proveedor creado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierForm }) =>
      api.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Proveedor actualizado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Proveedor eliminado" });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const handleOpenEdit = (supplier: any) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      cuit: supplier.cuit || "",
      notes: supplier.notes || "",
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const supplierList = suppliers || [];
  const purchaseList = purchases || [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestiona proveedores y compras
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo proveedor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(summary?.total_debt || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras este mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(summary?.month_purchases || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar proveedores..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Cargando proveedores...
                </div>
              ) : supplierList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>CUIT</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierList.map((supplier: any) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            {supplier.email && (
                              <p className="text-sm text-muted-foreground">{supplier.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {supplier.contact_name && <p>{supplier.contact_name}</p>}
                            {supplier.phone && (
                              <p className="text-sm text-muted-foreground">{supplier.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{supplier.cuit || "-"}</TableCell>
                        <TableCell>
                          <span className={supplier.balance > 0 ? "text-red-600 font-medium" : ""}>
                            {formatPrice(supplier.balance || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(supplier)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Eliminar este proveedor?")) {
                                  deleteMutation.mutate(supplier.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay proveedores. Agrega el primero.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardContent className="pt-6">
              {purchaseList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pagado</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseList.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {purchase.date
                            ? format(new Date(purchase.date), "dd/MM/yy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>{purchase.supplier?.name}</TableCell>
                        <TableCell>{purchase.invoice_number || "-"}</TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(purchase.total)}
                        </TableCell>
                        <TableCell>{formatPrice(purchase.paid_amount || 0)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              purchase.status === "paid"
                                ? "default"
                                : purchase.status === "partial"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {purchase.status === "paid"
                              ? "Pagado"
                              : purchase.status === "partial"
                              ? "Parcial"
                              : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay compras registradas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar proveedor" : "Nuevo proveedor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre/Razon social *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Persona de contacto</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Nombre de contacto"
                />
              </div>
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input
                  value={form.cuit}
                  onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                  placeholder="20-12345678-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@proveedor.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="11-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Direccion</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Direccion del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
