"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Filter,
  Loader2,
  Edit2,
  Trash2,
  PieChart,
  BarChart3,
  Receipt,
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

interface MovementForm {
  type: "ingreso" | "egreso";
  concept: string;
  category: string;
  amount: string;
  date: string;
  notes: string;
}

// ============ DEFAULT VALUES ============

const defaultMovementForm: MovementForm = {
  type: "ingreso",
  concept: "",
  category: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

// ============ MAIN COMPONENT ============

export default function FinanzasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [cashFlowDays, setCashFlowDays] = useState<number>(30);

  // Dialog states
  const [showMovementDialog, setShowMovementDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movementForm, setMovementForm] = useState<MovementForm>(defaultMovementForm);

  // ============ QUERIES ============

  const { data: periodSummaries, isLoading: loadingPeriods } = useQuery({
    queryKey: ["finance-periods"],
    queryFn: () => api.getFinancePeriodSummaries(),
  });

  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ["movements", typeFilter, categoryFilter, dateRange],
    queryFn: () =>
      api.getMovements({
        type: typeFilter !== "all" ? typeFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
      }),
  });

  const { data: incomeCategories } = useQuery({
    queryKey: ["income-categories"],
    queryFn: () => api.getIncomeCategories(),
  });

  const { data: expenseCategories } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => api.getExpenseCategories(),
  });

  const { data: incomeSummary } = useQuery({
    queryKey: ["income-summary", dateRange],
    queryFn: () =>
      api.getFinanceSummaryByCategory("ingreso", {
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
      }),
    enabled: activeTab === "categories",
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ["expense-summary", dateRange],
    queryFn: () =>
      api.getFinanceSummaryByCategory("egreso", {
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
      }),
    enabled: activeTab === "categories",
  });

  const { data: cashFlow, isLoading: loadingCashFlow } = useQuery({
    queryKey: ["cash-flow", cashFlowDays],
    queryFn: () => api.getCashFlow(cashFlowDays),
    enabled: activeTab === "cashflow",
  });

  // ============ MUTATIONS ============

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["finance-periods"] });
      queryClient.invalidateQueries({ queryKey: ["income-summary"] });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      toast({ title: "Movimiento registrado correctamente" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateMovement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["finance-periods"] });
      toast({ title: "Movimiento actualizado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMovement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["finance-periods"] });
      toast({ title: "Movimiento eliminado" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ============ HANDLERS ============

  const handleOpenCreateIncome = () => {
    setEditingId(null);
    setMovementForm({ ...defaultMovementForm, type: "ingreso" });
    setShowMovementDialog(true);
  };

  const handleOpenCreateExpense = () => {
    setEditingId(null);
    setMovementForm({ ...defaultMovementForm, type: "egreso" });
    setShowMovementDialog(true);
  };

  const handleOpenEdit = (movement: any) => {
    // No permitir editar movimientos automáticos
    if (movement.sale_id || movement.order_id) {
      toast({
        title: "No editable",
        description: "Los movimientos automáticos no se pueden editar",
        variant: "destructive",
      });
      return;
    }
    setEditingId(movement.id);
    setMovementForm({
      type: movement.type,
      concept: movement.concept,
      category: movement.category || "",
      amount: movement.amount?.toString() || "",
      date: movement.date?.split("T")[0] || "",
      notes: movement.notes || "",
    });
    setShowMovementDialog(true);
  };

  const handleCloseDialog = () => {
    setShowMovementDialog(false);
    setEditingId(null);
    setMovementForm(defaultMovementForm);
  };

  const handleSubmit = () => {
    if (!movementForm.concept.trim()) {
      toast({ title: "El concepto es requerido", variant: "destructive" });
      return;
    }
    if (!movementForm.amount || parseFloat(movementForm.amount) <= 0) {
      toast({ title: "El monto debe ser mayor a 0", variant: "destructive" });
      return;
    }

    const data = {
      type: movementForm.type,
      concept: movementForm.concept,
      category: movementForm.category || null,
      amount: parseFloat(movementForm.amount),
      date: movementForm.date,
      notes: movementForm.notes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (movement: any) => {
    if (movement.sale_id || movement.order_id) {
      toast({
        title: "No se puede eliminar",
        description: "Los movimientos automáticos no se pueden eliminar",
        variant: "destructive",
      });
      return;
    }
    if (confirm("¿Eliminar este movimiento?")) {
      deleteMutation.mutate(movement.id);
    }
  };

  // ============ COMPUTED VALUES ============

  const movementList = movements || [];
  const currentMonth = periodSummaries?.find((p: any) => p.period === "month");
  const today = periodSummaries?.find((p: any) => p.period === "today");

  const categories =
    movementForm.type === "ingreso" ? incomeCategories : expenseCategories;

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ============ RENDER ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finanzas</h1>
          <p className="text-muted-foreground">
            Control de ingresos, egresos y flujo de caja
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCreateExpense}>
            <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500" />
            Nuevo egreso
          </Button>
          <Button onClick={handleOpenCreateIncome}>
            <ArrowUpCircle className="mr-2 h-4 w-4 text-green-500" />
            Nuevo ingreso
          </Button>
        </div>
      </div>

      {/* Period Summary Cards */}
      {loadingPeriods ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {/* Hoy */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(today?.balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPrice(today?.balance || 0)}
              </div>
              <div className="flex gap-4 mt-1 text-xs">
                <span className="text-green-600">+{formatPrice(today?.income || 0)}</span>
                <span className="text-red-600">-{formatPrice(today?.expenses || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Este mes - Ingresos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos del mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(currentMonth?.income || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                ingresos registrados
              </p>
            </CardContent>
          </Card>

          {/* Este mes - Egresos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Egresos del mes</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(currentMonth?.expenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                gastos registrados
              </p>
            </CardContent>
          </Card>

          {/* Balance del mes */}
          <Card className={(currentMonth?.balance || 0) >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance del mes</CardTitle>
              <Wallet className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(currentMonth?.balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPrice(currentMonth?.balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(currentMonth?.balance || 0) >= 0 ? "Ganancia neta" : "Pérdida neta"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Receipt className="mr-2 h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <PieChart className="mr-2 h-4 w-4" />
            Por categoría
          </TabsTrigger>
          <TabsTrigger value="cashflow">
            <BarChart3 className="mr-2 h-4 w-4" />
            Flujo de caja
          </TabsTrigger>
        </TabsList>

        {/* ============ TAB: MOVIMIENTOS ============ */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ingreso">Ingresos</SelectItem>
                    <SelectItem value="egreso">Egresos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    <Separator className="my-1" />
                    {incomeCategories?.map((c: any) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    {expenseCategories?.map((c: any) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="w-[150px]"
                    placeholder="Desde"
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="w-[150px]"
                    placeholder="Hasta"
                  />
                  {(dateRange.from || dateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateRange({ from: "", to: "" })}
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMovements ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando movimientos...
                </div>
              ) : movementList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementList.map((movement: any) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {movement.date
                            ? format(new Date(movement.date), "dd/MM/yy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {movement.type === "ingreso" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Ingreso
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Egreso
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {movement.concept}
                        </TableCell>
                        <TableCell>
                          {movement.category ? (
                            <Badge variant="outline">{movement.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${movement.type === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                          {movement.type === "ingreso" ? "+" : "-"}
                          {formatPrice(movement.amount)}
                        </TableCell>
                        <TableCell>
                          {movement.sale_id ? (
                            <Badge variant="secondary">Venta</Badge>
                          ) : movement.order_id ? (
                            <Badge variant="secondary">Pedido</Badge>
                          ) : (
                            <Badge variant="outline">Manual</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(movement)}
                              disabled={movement.sale_id || movement.order_id}
                              title={movement.sale_id || movement.order_id ? "No editable" : "Editar"}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(movement)}
                              disabled={movement.sale_id || movement.order_id}
                              title={movement.sale_id || movement.order_id ? "No eliminable" : "Eliminar"}
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
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No hay movimientos registrados</p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button variant="outline" onClick={handleOpenCreateExpense}>
                      Registrar egreso
                    </Button>
                    <Button onClick={handleOpenCreateIncome}>
                      Registrar ingreso
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TAB: POR CATEGORÍA ============ */}
        <TabsContent value="categories">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Ingresos por categoría */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Ingresos por categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomeSummary && incomeSummary.length > 0 ? (
                  <div className="space-y-4">
                    {incomeSummary.map((cat: any) => (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-green-600 font-semibold">
                            {formatPrice(cat.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12">
                            {cat.percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} movimiento(s)
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay datos de ingresos
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Egresos por categoría */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Egresos por categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenseSummary && expenseSummary.length > 0 ? (
                  <div className="space-y-4">
                    {expenseSummary.map((cat: any) => (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cat.category}</span>
                          <span className="text-red-600 font-semibold">
                            {formatPrice(cat.total)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12">
                            {cat.percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {cat.count} movimiento(s)
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay datos de egresos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ TAB: FLUJO DE CAJA ============ */}
        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Flujo de caja</CardTitle>
                <Select
                  value={cashFlowDays.toString()}
                  onValueChange={(v) => setCashFlowDays(parseInt(v))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 días</SelectItem>
                    <SelectItem value="30">Últimos 30 días</SelectItem>
                    <SelectItem value="90">Últimos 90 días</SelectItem>
                    <SelectItem value="365">Último año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCashFlow ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Cargando flujo de caja...
                </div>
              ) : cashFlow ? (
                <div className="space-y-6">
                  {/* Resumen del flujo */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Balance inicial</p>
                      <p className="text-xl font-bold">{formatPrice(cashFlow.opening_balance)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total ingresos</p>
                      <p className="text-xl font-bold text-green-600">+{formatPrice(cashFlow.total_income)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Total egresos</p>
                      <p className="text-xl font-bold text-red-600">-{formatPrice(cashFlow.total_expenses)}</p>
                    </div>
                    <div className={`rounded-lg p-4 ${cashFlow.closing_balance >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                      <p className="text-sm text-muted-foreground">Balance final</p>
                      <p className={`text-xl font-bold ${cashFlow.closing_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatPrice(cashFlow.closing_balance)}
                      </p>
                    </div>
                  </div>

                  {/* Tabla de flujo diario */}
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Egresos</TableHead>
                          <TableHead className="text-right">Balance del día</TableHead>
                          <TableHead className="text-right">Balance acumulado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashFlow.daily_flow
                          .filter((day: any) => day.income > 0 || day.expenses > 0)
                          .map((day: any) => (
                            <TableRow key={day.date}>
                              <TableCell>
                                {format(new Date(day.date), "dd/MM/yy", { locale: es })}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {day.income > 0 ? `+${formatPrice(day.income)}` : "-"}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {day.expenses > 0 ? `-${formatPrice(day.expenses)}` : "-"}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${day.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {day.balance >= 0 ? "+" : ""}{formatPrice(day.balance)}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${day.cumulative_balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatPrice(day.cumulative_balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay datos de flujo de caja
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ DIALOG: MOVIMIENTO ============ */}
      <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementForm.type === "ingreso" ? (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-green-500" />
                  {editingId ? "Editar ingreso" : "Nuevo ingreso"}
                </>
              ) : (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-red-500" />
                  {editingId ? "Editar egreso" : "Nuevo egreso"}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {movementForm.type === "ingreso"
                ? "Registra un cobro, venta u otro ingreso"
                : "Registra un gasto, pago u otro egreso"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editingId && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={movementForm.type === "ingreso" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMovementForm({ ...movementForm, type: "ingreso", category: "" })}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Ingreso
                </Button>
                <Button
                  type="button"
                  variant={movementForm.type === "egreso" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMovementForm({ ...movementForm, type: "egreso", category: "" })}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Egreso
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Concepto *</Label>
              <Input
                value={movementForm.concept}
                onChange={(e) => setMovementForm({ ...movementForm, concept: e.target.value })}
                placeholder={movementForm.type === "ingreso" ? "Ej: Cobro factura cliente X" : "Ej: Pago alquiler local"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={movementForm.amount}
                  onChange={(e) => setMovementForm({ ...movementForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={movementForm.date}
                  onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={movementForm.category}
                onValueChange={(value) => setMovementForm({ ...movementForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={movementForm.notes}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className={movementForm.type === "ingreso" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Guardar cambios" : `Registrar ${movementForm.type}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
