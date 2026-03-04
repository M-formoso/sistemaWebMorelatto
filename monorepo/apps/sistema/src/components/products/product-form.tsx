"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

export interface ProductFormData {
  name: string;
  code: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  stock_min: number;
  weight: number;
  color: string;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  show_in_decoration: boolean;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  onChange: (data: ProductFormData) => void;
  disabled?: boolean;
}

const defaultFormData: ProductFormData = {
  name: "",
  code: "",
  description: "",
  price: 0,
  cost: 0,
  stock: 0,
  stock_min: 5,
  weight: 0,
  color: "",
  category_id: "",
  is_active: true,
  is_featured: false,
  show_in_decoration: false,
};

export function ProductForm({ initialData, onChange, disabled }: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    ...defaultFormData,
    ...initialData,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      {/* Informacion basica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informacion basica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ej: Lana Merino Premium"
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Codigo *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                placeholder="Ej: LAN-001"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Descripcion detallada del producto..."
              rows={3}
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id || "none"}
                onValueChange={(value) => handleChange("category_id", value === "none" ? "" : value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoria</SelectItem>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color / Variante</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange("color", e.target.value)}
                placeholder="Ej: Rojo, Azul, Natural"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Precios y stock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Precios y stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio de venta *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Costo</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleChange("cost", parseFloat(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock actual</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange("stock", parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_min">Stock minimo</Label>
              <Input
                id="stock_min"
                type="number"
                min="0"
                value={formData.stock_min}
                onChange={(e) => handleChange("stock_min", parseInt(e.target.value) || 0)}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (gramos)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange("weight", parseFloat(e.target.value) || 0)}
                placeholder="Ej: 100"
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuracion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuracion de publicacion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Publicado en la web</Label>
              <p className="text-sm text-muted-foreground">
                El producto sera visible en la tienda online
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange("is_active", checked)}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Producto destacado</Label>
              <p className="text-sm text-muted-foreground">
                Aparecera en la seccion de destacados del home
              </p>
            </div>
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked) => handleChange("is_featured", checked)}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mostrar en decoracion</Label>
              <p className="text-sm text-muted-foreground">
                El producto aparecera en la seccion de decoracion
              </p>
            </div>
            <Switch
              checked={formData.show_in_decoration}
              onCheckedChange={(checked) => handleChange("show_in_decoration", checked)}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
