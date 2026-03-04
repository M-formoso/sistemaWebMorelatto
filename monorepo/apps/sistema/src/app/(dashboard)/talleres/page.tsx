"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Search, Edit2, Trash2, Users, Calendar, Loader2, Eye } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

interface WorkshopForm {
  title: string;
  description: string;
  date: string;
  time: string;
  duration_hours: number;
  max_participants: number;
  price: number;
  location: string;
  materials_included: string;
  is_active: boolean;
}

const defaultForm: WorkshopForm = {
  title: "",
  description: "",
  date: "",
  time: "10:00",
  duration_hours: 3,
  max_participants: 10,
  price: 0,
  location: "",
  materials_included: "",
  is_active: true,
};

export default function TalleresPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showEnrollments, setShowEnrollments] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkshopForm>(defaultForm);

  const { data: workshops, isLoading } = useQuery({
    queryKey: ["workshops"],
    queryFn: () => api.getWorkshops(),
  });

  const { data: enrollments } = useQuery({
    queryKey: ["workshop-enrollments", showEnrollments],
    queryFn: () => api.getWorkshopEnrollments(showEnrollments!),
    enabled: !!showEnrollments,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createWorkshop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
      toast({ title: "Taller creado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateWorkshop(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workshops"] });
      toast({ title: "Taller actualizado" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const handleOpenEdit = (workshop: any) => {
    setEditingId(workshop.id);
    const workshopDate = workshop.date ? new Date(workshop.date) : new Date();
    setForm({
      title: workshop.title,
      description: workshop.description || "",
      date: format(workshopDate, "yyyy-MM-dd"),
      time: format(workshopDate, "HH:mm"),
      duration_hours: workshop.duration_hours || 3,
      max_participants: workshop.max_participants || 10,
      price: parseFloat(workshop.price) || 0,
      location: workshop.location || "",
      materials_included: workshop.materials_included || "",
      is_active: workshop.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "El titulo es requerido", variant: "destructive" });
      return;
    }
    if (!form.date) {
      toast({ title: "La fecha es requerida", variant: "destructive" });
      return;
    }

    const dateTime = new Date(`${form.date}T${form.time}`);
    const data = {
      title: form.title,
      description: form.description,
      date: dateTime.toISOString(),
      duration_hours: form.duration_hours,
      max_participants: form.max_participants,
      price: form.price,
      location: form.location,
      materials_included: form.materials_included,
      is_active: form.is_active,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const workshopList = workshops || [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Talleres</h1>
          <p className="text-muted-foreground">
            Gestiona los talleres y cursos
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo taller
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando talleres...
            </div>
          ) : workshopList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taller</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Duracion</TableHead>
                  <TableHead>Inscriptos</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workshopList.map((workshop: any) => (
                  <TableRow key={workshop.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{workshop.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {workshop.location}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {workshop.date
                        ? format(new Date(workshop.date), "dd MMM yyyy HH:mm", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>{workshop.duration_hours}hs</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {workshop.enrolled_count || 0}/{workshop.max_participants}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(workshop.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={workshop.is_active ? "default" : "secondary"}>
                        {workshop.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowEnrollments(workshop.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(workshop)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No hay talleres. Crea el primero.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar taller" : "Nuevo taller"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Taller de tejido basico"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe el contenido del taller..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duracion (horas)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.duration_hours}
                  onChange={(e) => setForm({ ...form, duration_hours: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max. participantes</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_participants}
                  onChange={(e) => setForm({ ...form, max_participants: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ubicacion</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Ej: Local Morelatto, Av. Corrientes 1234"
              />
            </div>

            <div className="space-y-2">
              <Label>Materiales incluidos</Label>
              <Input
                value={form.materials_included}
                onChange={(e) => setForm({ ...form, materials_included: e.target.value })}
                placeholder="Ej: Lana, agujas, patron"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Taller activo</Label>
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

      {/* Enrollments Dialog */}
      <Dialog open={!!showEnrollments} onOpenChange={() => setShowEnrollments(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscriptos al taller</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {enrollments?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment: any) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>{enrollment.name}</TableCell>
                      <TableCell>{enrollment.email}</TableCell>
                      <TableCell>{enrollment.phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No hay inscriptos aun
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
