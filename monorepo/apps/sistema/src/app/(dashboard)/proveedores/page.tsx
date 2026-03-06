"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Building2,
  DollarSign,
  FileText,
  Eye,
  AlertTriangle,
  CreditCard,
  Banknote,
  CalendarClock,
  Receipt,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

// ============ TYPES ============

interface SupplierForm {
  name: string;
  business_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  cbu: string;
  alias: string;
  notes: string;
}

interface PurchaseForm {
  supplier_id: string;
  invoice_number: string;
  purchase_date: string;
  due_date: string;
  total_amount: string;
  description: string;
  notes: string;
}

interface PaymentForm {
  supplier_id: string;
  purchase_id: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  reference: string;
  notes: string;
}

// ============ DEFAULT VALUES ============

const defaultSupplierForm: SupplierForm = {
  name: "",
  business_name: "",
  tax_id: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  bank_name: "",
  account_number: "",
  account_type: "",
  cbu: "",
  alias: "",
  notes: "",
};

const defaultPurchaseForm: PurchaseForm = {
  supplier_id: "",
  invoice_number: "",
  purchase_date: new Date().toISOString().split("T")[0],
  due_date: "",
  total_amount: "",
  description: "",
  notes: "",
};

const defaultPaymentForm: PaymentForm = {
  supplier_id: "",
  purchase_id: "",
  payment_date: new Date().toISOString().split("T")[0],
  amount: "",
  payment_method: "transferencia",
  reference: "",
  notes: "",
};

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

const ACCOUNT_TYPES = [
  { value: "cuenta_corriente", label: "Cuenta Corriente" },
  { value: "caja_ahorro", label: "Caja de Ahorro" },
];

const PROVINCES = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

// ============ STATUS HELPERS ============

const getStatusBadge = (status: string, isOverdue: boolean) => {
  if (isOverdue) {
    return <Badge variant="destructive">Vencido</Badge>;
  }
  switch (status) {
    case "paid":
      return <Badge className="bg-green-600">Pagado</Badge>;
    case "partial":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Parcial</Badge>;
    case "pending":
      return <Badge variant="secondary">Pendiente</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

// ============ MAIN COMPONENT ============

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("suppliers");
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<string>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Dialog states
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<any>(null);

  // Forms
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(defaultSupplierForm);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(defaultPurchaseForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm);

  // ============ QUERIES ============

  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => api.getSuppliers({ search: search || undefined }),
  });

  const { data: purchases, isLoading: loadingPurchases } = useQuery({
    queryKey: ["supplier-purchases", purchaseStatusFilter, showOverdueOnly],
    queryFn: () =>
      api.getSupplierPurchases({
        status: purchaseStatusFilter !== "all" ? purchaseStatusFilter : undefined,
        overdue_only: showOverdueOnly || undefined,
      }),
    enabled: activeTab === "purchases" || activeTab === "payments",
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["supplier-payments"],
    queryFn: () => api.getSupplierPayments(),
    enabled: activeTab === "payments",
  });

  const { data: summary } = useQuery({
    queryKey: ["suppliers-summary"],
    queryFn: () => api.getSuppliersSummary(),
  });

  const { data: supplierDetail } = useQuery({
    queryKey: ["supplier-detail", selectedSupplier?.id],
    queryFn: () => api.getSupplier(selectedSupplier?.id),
    enabled: !!selectedSupplier?.id && showDetailDialog,
  });

  // ============ MUTATIONS ============

  // Supplier mutations
  const createSupplierMutation = useMutation({
    mutationFn: (data: SupplierForm) => api.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Proveedor creado correctamente" });
      handleCloseSupplierDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SupplierForm }) =>
      api.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Proveedor actualizado" });
      handleCloseSupplierDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => api.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Proveedor eliminado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Purchase mutations
  const createPurchaseMutation = useMutation({
    mutationFn: (data: any) => api.createSupplierPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Compra registrada correctamente" });
      handleClosePurchaseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateSupplierPurchase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Compra actualizada" });
      handleClosePurchaseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (id: string) => api.deleteSupplierPurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Compra eliminada" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Payment mutations
  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => api.createSupplierPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-detail"] });
      toast({ title: "Pago registrado correctamente" });
      handleClosePaymentDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => api.deleteSupplierPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
      toast({ title: "Pago eliminado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ============ HANDLERS ============

  // Supplier handlers
  const handleOpenCreateSupplier = () => {
    setEditingId(null);
    setSupplierForm(defaultSupplierForm);
    setShowSupplierDialog(true);
  };

  const handleOpenEditSupplier = (supplier: any) => {
    setEditingId(supplier.id);
    setSupplierForm({
      name: supplier.name || "",
      business_name: supplier.business_name || "",
      tax_id: supplier.tax_id || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      province: supplier.province || "",
      postal_code: supplier.postal_code || "",
      bank_name: supplier.bank_name || "",
      account_number: supplier.account_number || "",
      account_type: supplier.account_type || "",
      cbu: supplier.cbu || "",
      alias: supplier.alias || "",
      notes: supplier.notes || "",
    });
    setShowSupplierDialog(true);
  };

  const handleCloseSupplierDialog = () => {
    setShowSupplierDialog(false);
    setEditingId(null);
    setSupplierForm(defaultSupplierForm);
  };

  const handleSubmitSupplier = () => {
    if (!supplierForm.name.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateSupplierMutation.mutate({ id: editingId, data: supplierForm });
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
  };

  const handleViewSupplierDetail = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowDetailDialog(true);
  };

  // Purchase handlers
  const handleOpenCreatePurchase = (supplierId?: string) => {
    setEditingPurchaseId(null);
    setPurchaseForm({
      ...defaultPurchaseForm,
      supplier_id: supplierId || "",
    });
    setShowPurchaseDialog(true);
  };

  const handleOpenEditPurchase = (purchase: any) => {
    setEditingPurchaseId(purchase.id);
    setPurchaseForm({
      supplier_id: purchase.supplier_id,
      invoice_number: purchase.invoice_number || "",
      purchase_date: purchase.purchase_date?.split("T")[0] || "",
      due_date: purchase.due_date?.split("T")[0] || "",
      total_amount: purchase.total_amount?.toString() || "",
      description: purchase.description || "",
      notes: purchase.notes || "",
    });
    setShowPurchaseDialog(true);
  };

  const handleClosePurchaseDialog = () => {
    setShowPurchaseDialog(false);
    setEditingPurchaseId(null);
    setPurchaseForm(defaultPurchaseForm);
  };

  const handleSubmitPurchase = () => {
    if (!purchaseForm.supplier_id) {
      toast({ title: "Selecciona un proveedor", variant: "destructive" });
      return;
    }
    if (!purchaseForm.total_amount || parseFloat(purchaseForm.total_amount) <= 0) {
      toast({ title: "El monto debe ser mayor a 0", variant: "destructive" });
      return;
    }

    const data = {
      supplier_id: purchaseForm.supplier_id,
      invoice_number: purchaseForm.invoice_number || null,
      purchase_date: purchaseForm.purchase_date
        ? new Date(purchaseForm.purchase_date).toISOString()
        : new Date().toISOString(),
      due_date: purchaseForm.due_date
        ? new Date(purchaseForm.due_date).toISOString()
        : null,
      total_amount: parseFloat(purchaseForm.total_amount),
      description: purchaseForm.description || null,
      notes: purchaseForm.notes || null,
    };

    if (editingPurchaseId) {
      updatePurchaseMutation.mutate({ id: editingPurchaseId, data });
    } else {
      createPurchaseMutation.mutate(data);
    }
  };

  // Payment handlers
  const handleOpenCreatePayment = (purchase?: any) => {
    setSelectedPurchaseForPayment(purchase);
    setPaymentForm({
      ...defaultPaymentForm,
      supplier_id: purchase?.supplier_id || "",
      purchase_id: purchase?.id || "",
      amount: purchase?.remaining_amount?.toString() || "",
    });
    setShowPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
    setSelectedPurchaseForPayment(null);
    setPaymentForm(defaultPaymentForm);
  };

  const handleSubmitPayment = () => {
    if (!paymentForm.supplier_id) {
      toast({ title: "Selecciona un proveedor", variant: "destructive" });
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast({ title: "El monto debe ser mayor a 0", variant: "destructive" });
      return;
    }

    const data = {
      supplier_id: paymentForm.supplier_id,
      purchase_id: paymentForm.purchase_id || null,
      payment_date: paymentForm.payment_date
        ? new Date(paymentForm.payment_date).toISOString()
        : new Date().toISOString(),
      amount: parseFloat(paymentForm.amount),
      payment_method: paymentForm.payment_method || null,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null,
    };

    createPaymentMutation.mutate(data);
  };

  // ============ COMPUTED VALUES ============

  const supplierList = suppliers || [];
  const purchaseList = purchases || [];
  const paymentList = payments || [];

  const totalDebt = summary?.reduce((acc: number, s: any) => acc + (parseFloat(s.total_debt) || 0), 0) || 0;
  const overdueDebt = summary?.reduce((acc: number, s: any) => acc + (parseFloat(s.overdue_debt) || 0), 0) || 0;
  const overduePurchases = summary?.reduce((acc: number, s: any) => acc + (s.overdue_purchases || 0), 0) || 0;

  const isSupplierPending = createSupplierMutation.isPending || updateSupplierMutation.isPending;
  const isPurchasePending = createPurchaseMutation.isPending || updatePurchaseMutation.isPending;
  const isPaymentPending = createPaymentMutation.isPending;

  // ============ RENDER ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestiona proveedores, compras y pagos - Cuenta corriente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenCreatePurchase()}>
            <Receipt className="mr-2 h-4 w-4" />
            Nueva compra
          </Button>
          <Button onClick={handleOpenCreateSupplier}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proveedor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supplierList.length}</div>
            <p className="text-xs text-muted-foreground">
              proveedores activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPrice(totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              a pagar a proveedores
            </p>
          </CardContent>
        </Card>

        <Card className={overdueDebt > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda vencida</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueDebt > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueDebt > 0 ? "text-red-600" : ""}`}>
              {formatPrice(overdueDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overduePurchases} factura(s) vencida(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseList.filter((p: any) => p.status !== "paid").length}
            </div>
            <p className="text-xs text-muted-foreground">
              facturas por pagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suppliers">
            <Building2 className="mr-2 h-4 w-4" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <Receipt className="mr-2 h-4 w-4" />
            Compras / Facturas
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Wallet className="mr-2 h-4 w-4" />
            Pagos
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB: PROVEEDORES ============ */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, razón social, CUIT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingSuppliers ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando proveedores...
                </div>
              ) : supplierList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>CUIT</TableHead>
                      <TableHead>Datos bancarios</TableHead>
                      <TableHead className="text-right">Deuda</TableHead>
                      <TableHead className="w-[120px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierList.map((supplier: any) => (
                      <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => handleViewSupplierDetail(supplier)}>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            {supplier.business_name && (
                              <p className="text-sm text-muted-foreground">{supplier.business_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleViewSupplierDetail(supplier)}>
                          <div className="text-sm">
                            {supplier.email && <p>{supplier.email}</p>}
                            {supplier.phone && (
                              <p className="text-muted-foreground">{supplier.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleViewSupplierDetail(supplier)}>
                          {supplier.tax_id || "-"}
                        </TableCell>
                        <TableCell onClick={() => handleViewSupplierDetail(supplier)}>
                          {supplier.cbu || supplier.alias ? (
                            <div className="text-sm">
                              {supplier.alias && <p className="font-medium">{supplier.alias}</p>}
                              {supplier.cbu && <p className="text-muted-foreground text-xs">{supplier.cbu}</p>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={() => handleViewSupplierDetail(supplier)}>
                          <span className={supplier.total_debt > 0 ? "text-red-600 font-semibold" : "text-green-600"}>
                            {formatPrice(supplier.total_debt || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewSupplierDetail(supplier)}
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditSupplier(supplier)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (supplier.total_debt > 0) {
                                  toast({
                                    title: "No se puede eliminar",
                                    description: "El proveedor tiene deuda pendiente",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (confirm("¿Eliminar este proveedor?")) {
                                  deleteSupplierMutation.mutate(supplier.id);
                                }
                              }}
                              title="Eliminar"
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
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay proveedores registrados</p>
                  <Button variant="link" onClick={handleOpenCreateSupplier}>
                    Agregar el primero
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: COMPRAS ============ */}
        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={purchaseStatusFilter} onValueChange={setPurchaseStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="partial">Pago parcial</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={showOverdueOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Solo vencidas
                  </Button>
                </div>
                <Button onClick={() => handleOpenCreatePurchase()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva compra
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPurchases ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando compras...
                </div>
              ) : purchaseList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[140px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseList.map((purchase: any) => (
                      <TableRow key={purchase.id} className={purchase.is_overdue ? "bg-red-50" : ""}>
                        <TableCell>
                          {purchase.purchase_date
                            ? format(new Date(purchase.purchase_date), "dd/MM/yy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {purchase.supplier_name || "-"}
                        </TableCell>
                        <TableCell>{purchase.invoice_number || "-"}</TableCell>
                        <TableCell>
                          {purchase.due_date ? (
                            <div className="flex items-center gap-1">
                              <CalendarClock className={`h-3 w-3 ${purchase.is_overdue ? "text-red-500" : "text-muted-foreground"}`} />
                              <span className={purchase.is_overdue ? "text-red-600 font-medium" : ""}>
                                {format(new Date(purchase.due_date), "dd/MM/yy", { locale: es })}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(purchase.total_amount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatPrice(purchase.paid_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatPrice(purchase.remaining_amount || 0)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(purchase.status, purchase.is_overdue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {purchase.status !== "paid" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenCreatePayment(purchase)}
                                title="Registrar pago"
                              >
                                <Banknote className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditPurchase(purchase)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (parseFloat(purchase.paid_amount) > 0) {
                                  toast({
                                    title: "No se puede eliminar",
                                    description: "La compra tiene pagos asociados",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (confirm("¿Eliminar esta compra?")) {
                                  deletePurchaseMutation.mutate(purchase.id);
                                }
                              }}
                              title="Eliminar"
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
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay compras registradas</p>
                  <Button variant="link" onClick={() => handleOpenCreatePurchase()}>
                    Registrar la primera
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: PAGOS ============ */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Historial de pagos</CardTitle>
                <Button onClick={() => handleOpenCreatePayment()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo pago
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando pagos...
                </div>
              ) : paymentList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentList.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.payment_date
                            ? format(new Date(payment.payment_date), "dd/MM/yy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.supplier_name || "-"}
                        </TableCell>
                        <TableCell>
                          {payment.purchase_invoice || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payment.reference || "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatPrice(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("¿Eliminar este pago? Esto actualizará el saldo de la compra.")) {
                                deletePaymentMutation.mutate(payment.id);
                              }
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay pagos registrados</p>
                  <Button variant="link" onClick={() => handleOpenCreatePayment()}>
                    Registrar el primero
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ DIALOG: PROVEEDOR ============ */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar proveedor" : "Nuevo proveedor"}
            </DialogTitle>
            <DialogDescription>
              Completa la información del proveedor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Información básica */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Información básica
              </h4>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Razón social</Label>
                    <Input
                      value={supplierForm.business_name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, business_name: e.target.value })}
                      placeholder="Razón social"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CUIT</Label>
                    <Input
                      value={supplierForm.tax_id}
                      onChange={(e) => setSupplierForm({ ...supplierForm, tax_id: e.target.value })}
                      placeholder="20-12345678-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      placeholder="email@proveedor.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      placeholder="11-1234-5678"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dirección */}
            <div>
              <h4 className="text-sm font-medium mb-3">Dirección</h4>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="Calle y número"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={supplierForm.city}
                      onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                      placeholder="Ciudad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provincia</Label>
                    <Select
                      value={supplierForm.province}
                      onValueChange={(value) => setSupplierForm({ ...supplierForm, province: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((prov) => (
                          <SelectItem key={prov} value={prov}>
                            {prov}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Código Postal</Label>
                    <Input
                      value={supplierForm.postal_code}
                      onChange={(e) => setSupplierForm({ ...supplierForm, postal_code: e.target.value })}
                      placeholder="1234"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Información bancaria */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Información bancaria
              </h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input
                      value={supplierForm.bank_name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, bank_name: e.target.value })}
                      placeholder="Nombre del banco"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de cuenta</Label>
                    <Select
                      value={supplierForm.account_type}
                      onValueChange={(value) => setSupplierForm({ ...supplierForm, account_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Número de cuenta</Label>
                  <Input
                    value={supplierForm.account_number}
                    onChange={(e) => setSupplierForm({ ...supplierForm, account_number: e.target.value })}
                    placeholder="Número de cuenta"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CBU</Label>
                    <Input
                      value={supplierForm.cbu}
                      onChange={(e) => setSupplierForm({ ...supplierForm, cbu: e.target.value })}
                      placeholder="CBU (22 dígitos)"
                      maxLength={22}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alias</Label>
                    <Input
                      value={supplierForm.alias}
                      onChange={(e) => setSupplierForm({ ...supplierForm, alias: e.target.value })}
                      placeholder="Alias de transferencia"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                placeholder="Notas adicionales sobre el proveedor..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSupplierDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitSupplier} disabled={isSupplierPending}>
              {isSupplierPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: COMPRA ============ */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPurchaseId ? "Editar compra" : "Nueva compra"}
            </DialogTitle>
            <DialogDescription>
              Registra una factura o compra a proveedor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select
                value={purchaseForm.supplier_id}
                onValueChange={(value) => setPurchaseForm({ ...purchaseForm, supplier_id: value })}
                disabled={!!editingPurchaseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {supplierList.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de factura</Label>
                <Input
                  value={purchaseForm.invoice_number}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
                  placeholder="A-0001-00001234"
                />
              </div>
              <div className="space-y-2">
                <Label>Monto total *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={purchaseForm.total_amount}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, total_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de compra</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchase_date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input
                  type="date"
                  value={purchaseForm.due_date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={purchaseForm.description}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                placeholder="Descripción de la compra..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={purchaseForm.notes}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClosePurchaseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPurchase} disabled={isPurchasePending}>
              {isPurchasePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingPurchaseId ? "Guardar cambios" : "Registrar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: PAGO ============ */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              {selectedPurchaseForPayment
                ? `Pago para factura ${selectedPurchaseForPayment.invoice_number || "s/n"} - Saldo: ${formatPrice(selectedPurchaseForPayment.remaining_amount)}`
                : "Registra un pago a proveedor"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!selectedPurchaseForPayment && (
              <>
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select
                    value={paymentForm.supplier_id}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, supplier_id: value, purchase_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierList.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {paymentForm.supplier_id && (
                  <div className="space-y-2">
                    <Label>Factura (opcional)</Label>
                    <Select
                      value={paymentForm.purchase_id}
                      onValueChange={(value) => {
                        const purchase = purchaseList.find((p: any) => p.id === value);
                        setPaymentForm({
                          ...paymentForm,
                          purchase_id: value,
                          amount: purchase?.remaining_amount?.toString() || paymentForm.amount,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar factura" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin asociar a factura</SelectItem>
                        {purchaseList
                          .filter((p: any) => p.supplier_id === paymentForm.supplier_id && p.status !== "paid")
                          .map((purchase: any) => (
                            <SelectItem key={purchase.id} value={purchase.id}>
                              {purchase.invoice_number || "S/N"} - Saldo: {formatPrice(purchase.remaining_amount)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de pago</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="Nro. transferencia, cheque..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClosePaymentDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPayment} disabled={isPaymentPending}>
              {isPaymentPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DIALOG: DETALLE PROVEEDOR ============ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedSupplier?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSupplier?.business_name || "Cuenta corriente del proveedor"}
            </DialogDescription>
          </DialogHeader>

          {supplierDetail ? (
            <div className="space-y-6 py-4">
              {/* Resumen financiero */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total compras</div>
                    <div className="text-xl font-bold">
                      {formatPrice(supplierDetail.summary?.total_amount || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total pagado</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatPrice(supplierDetail.summary?.total_paid || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Deuda actual</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatPrice(supplierDetail.summary?.total_debt || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className={supplierDetail.summary?.overdue_debt > 0 ? "border-red-200 bg-red-50" : ""}>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Deuda vencida</div>
                    <div className={`text-xl font-bold ${supplierDetail.summary?.overdue_debt > 0 ? "text-red-600" : ""}`}>
                      {formatPrice(supplierDetail.summary?.overdue_debt || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Información de contacto y bancaria */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Contacto</h4>
                  <div className="text-sm space-y-1">
                    {supplierDetail.tax_id && <p><strong>CUIT:</strong> {supplierDetail.tax_id}</p>}
                    {supplierDetail.email && <p><strong>Email:</strong> {supplierDetail.email}</p>}
                    {supplierDetail.phone && <p><strong>Teléfono:</strong> {supplierDetail.phone}</p>}
                    {supplierDetail.address && (
                      <p><strong>Dirección:</strong> {supplierDetail.address}, {supplierDetail.city}, {supplierDetail.province}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Datos bancarios</h4>
                  <div className="text-sm space-y-1">
                    {supplierDetail.bank_name && <p><strong>Banco:</strong> {supplierDetail.bank_name}</p>}
                    {supplierDetail.account_type && (
                      <p><strong>Tipo:</strong> {ACCOUNT_TYPES.find(t => t.value === supplierDetail.account_type)?.label || supplierDetail.account_type}</p>
                    )}
                    {supplierDetail.cbu && <p><strong>CBU:</strong> {supplierDetail.cbu}</p>}
                    {supplierDetail.alias && <p><strong>Alias:</strong> {supplierDetail.alias}</p>}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Compras */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Compras / Facturas</h4>
                  <Button size="sm" onClick={() => {
                    setShowDetailDialog(false);
                    handleOpenCreatePurchase(selectedSupplier?.id);
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva compra
                  </Button>
                </div>
                {supplierDetail.purchases?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierDetail.purchases.map((purchase: any) => (
                        <TableRow key={purchase.id} className={purchase.is_overdue ? "bg-red-50" : ""}>
                          <TableCell>
                            {format(new Date(purchase.purchase_date), "dd/MM/yy", { locale: es })}
                          </TableCell>
                          <TableCell>{purchase.invoice_number || "-"}</TableCell>
                          <TableCell>
                            {purchase.due_date
                              ? format(new Date(purchase.due_date), "dd/MM/yy", { locale: es })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(purchase.total_amount)}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {formatPrice(purchase.remaining_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(purchase.status, purchase.is_overdue)}</TableCell>
                          <TableCell>
                            {purchase.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setShowDetailDialog(false);
                                  handleOpenCreatePayment(purchase);
                                }}
                              >
                                <Banknote className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay compras registradas
                  </p>
                )}
              </div>

              <Separator />

              {/* Pagos */}
              <div>
                <h4 className="font-medium mb-3">Historial de pagos</h4>
                {supplierDetail.payments?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierDetail.payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.payment_date), "dd/MM/yy", { locale: es })}
                          </TableCell>
                          <TableCell>{payment.purchase_invoice || "-"}</TableCell>
                          <TableCell>
                            {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method || "-"}
                          </TableCell>
                          <TableCell>{payment.reference || "-"}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatPrice(payment.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay pagos registrados
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setShowDetailDialog(false);
              handleOpenEditSupplier(selectedSupplier);
            }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
