"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, CreditCard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface PaymentMethodForm {
  name: string;
  type: string;
  description: string;
  instructions: string;
  display_order: number;
  is_active: boolean;
}

const defaultForm: PaymentMethodForm = {
  name: "",
  type: "bank_transfer",
  description: "",
  instructions: "",
  display_order: 1,
  is_active: true,
};

const paymentTypes = [
  { value: "mercadopago", label: "MercadoPago" },
  { value: "stripe", label: "Stripe" },
  { value: "bank_transfer", label: "Transferencia Bancaria" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

export default function ConfiguracionPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentMethodForm>(defaultForm);

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api.getPaymentMethods(),
  });

  const createMutation = useMutation({
    mutationFn: (data: PaymentMethodForm) => api.createPaymentMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Metodo de pago creado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentMethodForm }) =>
      api.updatePaymentMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Metodo de pago actualizado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Metodo de pago eliminado" });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const handleOpenEdit = (method: any) => {
    setEditingId(method.id);
    setForm({
      name: method.name,
      type: method.type,
      description: method.description || "",
      instructions: method.instructions || "",
      display_order: method.display_order || 1,
      is_active: method.is_active ?? true,
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

  const methodList = paymentMethods || [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuracion</h1>
          <p className="text-muted-foreground">
            Ajustes generales del sistema
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Metodos de pago
            </CardTitle>
            <CardDescription>
              Configura los metodos de pago disponibles en el checkout
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando metodos de pago...
            </div>
          ) : methodList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methodList.map((method: any) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{method.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentTypes.find((t) => t.value === method.type)?.label || method.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {method.description || "-"}
                    </TableCell>
                    <TableCell>{method.display_order}</TableCell>
                    <TableCell>
                      <Badge variant={method.is_active ? "default" : "secondary"}>
                        {method.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(method)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Eliminar este metodo de pago?")) {
                              deleteMutation.mutate(method.id);
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
              No hay metodos de pago configurados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              MercadoPago
            </CardTitle>
            <CardDescription>
              Configuracion de pagos con MercadoPago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Las credenciales de MercadoPago se configuran en las variables de entorno del servidor:
            </p>
            <ul className="mt-2 text-sm space-y-1">
              <li><code className="bg-muted px-1 rounded">MERCADOPAGO_ACCESS_TOKEN</code></li>
              <li><code className="bg-muted px-1 rounded">MERCADOPAGO_PUBLIC_KEY</code></li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Facturacion AFIP
            </CardTitle>
            <CardDescription>
              Configuracion de facturacion electronica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Los certificados de AFIP se configuran en las variables de entorno:
            </p>
            <ul className="mt-2 text-sm space-y-1">
              <li><code className="bg-muted px-1 rounded">AFIP_CUIT</code></li>
              <li><code className="bg-muted px-1 rounded">AFIP_CERT_PATH</code></li>
              <li><code className="bg-muted px-1 rounded">AFIP_KEY_PATH</code></li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar metodo de pago" : "Nuevo metodo de pago"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Transferencia Bancaria"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripcion para el cliente"
              />
            </div>

            <div className="space-y-2">
              <Label>Instrucciones</Label>
              <Input
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder="Instrucciones de pago"
              />
            </div>

            <div className="space-y-2">
              <Label>Orden de visualizacion</Label>
              <Input
                type="number"
                min="1"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Metodo activo</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
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
