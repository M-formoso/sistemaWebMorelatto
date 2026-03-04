"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, MapPin, Truck } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

interface ZoneForm {
  name: string;
  description: string;
  cities: string;
  provinces: string;
  is_active: boolean;
}

interface RateForm {
  zone_id: string;
  min_weight: number;
  max_weight: number;
  base_cost: number;
  cost_per_kg: number;
  free_shipping_threshold: number;
  is_active: boolean;
}

const defaultZoneForm: ZoneForm = {
  name: "",
  description: "",
  cities: "",
  provinces: "",
  is_active: true,
};

const defaultRateForm: RateForm = {
  zone_id: "",
  min_weight: 0,
  max_weight: 99999,
  base_cost: 0,
  cost_per_kg: 0,
  free_shipping_threshold: 50000,
  is_active: true,
};

export default function EnviosPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("zones");
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneForm>(defaultZoneForm);
  const [rateForm, setRateForm] = useState<RateForm>(defaultRateForm);

  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ["shipping-zones"],
    queryFn: () => api.getShippingZones(),
  });

  const { data: rates, isLoading: ratesLoading } = useQuery({
    queryKey: ["shipping-rates"],
    queryFn: () => api.getShippingRates(),
  });

  // Zone mutations
  const createZoneMutation = useMutation({
    mutationFn: (data: any) => api.createShippingZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast({ title: "Zona creada" });
      handleCloseZoneDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateShippingZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast({ title: "Zona actualizada" });
      handleCloseZoneDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Rate mutations
  const createRateMutation = useMutation({
    mutationFn: (data: any) => api.createShippingRate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
      toast({ title: "Tarifa creada" });
      handleCloseRateDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateShippingRate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-rates"] });
      toast({ title: "Tarifa actualizada" });
      handleCloseRateDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Zone handlers
  const handleOpenCreateZone = () => {
    setEditingZoneId(null);
    setZoneForm(defaultZoneForm);
    setShowZoneDialog(true);
  };

  const handleOpenEditZone = (zone: any) => {
    setEditingZoneId(zone.id);
    setZoneForm({
      name: zone.name,
      description: zone.description || "",
      cities: zone.cities?.join(", ") || "",
      provinces: zone.provinces?.join(", ") || "",
      is_active: zone.is_active ?? true,
    });
    setShowZoneDialog(true);
  };

  const handleCloseZoneDialog = () => {
    setShowZoneDialog(false);
    setEditingZoneId(null);
    setZoneForm(defaultZoneForm);
  };

  const handleSubmitZone = () => {
    if (!zoneForm.name.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    const data = {
      name: zoneForm.name,
      description: zoneForm.description,
      cities: zoneForm.cities.split(",").map((c) => c.trim()).filter(Boolean),
      provinces: zoneForm.provinces.split(",").map((p) => p.trim()).filter(Boolean),
      is_active: zoneForm.is_active,
    };

    if (editingZoneId) {
      updateZoneMutation.mutate({ id: editingZoneId, data });
    } else {
      createZoneMutation.mutate(data);
    }
  };

  // Rate handlers
  const handleOpenCreateRate = () => {
    setEditingRateId(null);
    setRateForm(defaultRateForm);
    setShowRateDialog(true);
  };

  const handleOpenEditRate = (rate: any) => {
    setEditingRateId(rate.id);
    setRateForm({
      zone_id: rate.zone_id,
      min_weight: rate.min_weight || 0,
      max_weight: rate.max_weight || 99999,
      base_cost: parseFloat(rate.base_cost) || 0,
      cost_per_kg: parseFloat(rate.cost_per_kg) || 0,
      free_shipping_threshold: parseFloat(rate.free_shipping_threshold) || 50000,
      is_active: rate.is_active ?? true,
    });
    setShowRateDialog(true);
  };

  const handleCloseRateDialog = () => {
    setShowRateDialog(false);
    setEditingRateId(null);
    setRateForm(defaultRateForm);
  };

  const handleSubmitRate = () => {
    if (!rateForm.zone_id) {
      toast({ title: "Selecciona una zona", variant: "destructive" });
      return;
    }

    if (editingRateId) {
      updateRateMutation.mutate({ id: editingRateId, data: rateForm });
    } else {
      createRateMutation.mutate(rateForm);
    }
  };

  const zoneList = zones || [];
  const rateList = rates || [];
  const isZonePending = createZoneMutation.isPending || updateZoneMutation.isPending;
  const isRatePending = createRateMutation.isPending || updateRateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Envios</h1>
          <p className="text-muted-foreground">
            Configura zonas y tarifas de envio
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="zones">Zonas de envio</TabsTrigger>
          <TabsTrigger value="rates">Tarifas</TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Zonas de envio
              </CardTitle>
              <Button size="sm" onClick={handleOpenCreateZone}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva zona
              </Button>
            </CardHeader>
            <CardContent>
              {zonesLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Cargando zonas...
                </div>
              ) : zoneList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripcion</TableHead>
                      <TableHead>Provincias</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zoneList.map((zone: any) => (
                      <TableRow key={zone.id}>
                        <TableCell className="font-medium">{zone.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {zone.description || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {zone.provinces?.slice(0, 3).join(", ")}
                          {zone.provinces?.length > 3 && "..."}
                        </TableCell>
                        <TableCell>
                          <Badge variant={zone.is_active ? "default" : "secondary"}>
                            {zone.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditZone(zone)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay zonas configuradas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Tarifas de envio
              </CardTitle>
              <Button size="sm" onClick={handleOpenCreateRate}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva tarifa
              </Button>
            </CardHeader>
            <CardContent>
              {ratesLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Cargando tarifas...
                </div>
              ) : rateList.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zona</TableHead>
                      <TableHead>Costo base</TableHead>
                      <TableHead>Por kg</TableHead>
                      <TableHead>Envio gratis desde</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateList.map((rate: any) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {rate.zone?.name || "Sin zona"}
                        </TableCell>
                        <TableCell>{formatPrice(rate.base_cost)}</TableCell>
                        <TableCell>{formatPrice(rate.cost_per_kg)}</TableCell>
                        <TableCell>{formatPrice(rate.free_shipping_threshold)}</TableCell>
                        <TableCell>
                          <Badge variant={rate.is_active ? "default" : "secondary"}>
                            {rate.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditRate(rate)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No hay tarifas configuradas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zone Dialog */}
      <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingZoneId ? "Editar zona" : "Nueva zona de envio"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                placeholder="Ej: CABA"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                placeholder="Ej: Ciudad Autonoma de Buenos Aires"
              />
            </div>

            <div className="space-y-2">
              <Label>Provincias (separadas por coma)</Label>
              <Input
                value={zoneForm.provinces}
                onChange={(e) => setZoneForm({ ...zoneForm, provinces: e.target.value })}
                placeholder="Ej: Buenos Aires, CABA"
              />
            </div>

            <div className="space-y-2">
              <Label>Ciudades (separadas por coma)</Label>
              <Input
                value={zoneForm.cities}
                onChange={(e) => setZoneForm({ ...zoneForm, cities: e.target.value })}
                placeholder="Ej: La Plata, Quilmes, Lomas"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Zona activa</Label>
              <Switch
                checked={zoneForm.is_active}
                onCheckedChange={(checked) => setZoneForm({ ...zoneForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseZoneDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitZone} disabled={isZonePending}>
              {isZonePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingZoneId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rate Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRateId ? "Editar tarifa" : "Nueva tarifa de envio"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Zona *</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rateForm.zone_id}
                onChange={(e) => setRateForm({ ...rateForm, zone_id: e.target.value })}
              >
                <option value="">Seleccionar zona</option>
                {zoneList.map((zone: any) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Costo base</Label>
                <Input
                  type="number"
                  min="0"
                  value={rateForm.base_cost}
                  onChange={(e) => setRateForm({ ...rateForm, base_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Costo por kg</Label>
                <Input
                  type="number"
                  min="0"
                  value={rateForm.cost_per_kg}
                  onChange={(e) => setRateForm({ ...rateForm, cost_per_kg: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Envio gratis desde ($)</Label>
              <Input
                type="number"
                min="0"
                value={rateForm.free_shipping_threshold}
                onChange={(e) => setRateForm({ ...rateForm, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Tarifa activa</Label>
              <Switch
                checked={rateForm.is_active}
                onCheckedChange={(checked) => setRateForm({ ...rateForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRateDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitRate} disabled={isRatePending}>
              {isRatePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRateId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
