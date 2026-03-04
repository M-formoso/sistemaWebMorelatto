"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface ProductVariant {
  id: string;
  color_name: string;
  color_code: string;
  stock: number;
  stock_quantity?: number;
  is_active: boolean;
  image_url?: string;
}

interface VariantManagerProps {
  productId: string;
  variants: ProductVariant[];
  onVariantsChange?: () => void;
}

interface EditingVariant {
  id?: string;
  color_name: string;
  color_code: string;
  stock: number;
}

export function VariantManager({ productId, variants, onVariantsChange }: VariantManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingVariant>({
    color_name: "",
    color_code: "#000000",
    stock: 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: EditingVariant) =>
      api.createProductVariant(productId, {
        color_name: data.color_name,
        color_code: data.color_code,
        stock: data.stock,
        is_active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onVariantsChange?.();
      toast({ title: "Variante creada" });
      setIsAdding(false);
      setEditForm({ color_name: "", color_code: "#000000", stock: 0 });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear variante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditingVariant }) =>
      api.updateProductVariant(id, {
        color_name: data.color_name,
        color_code: data.color_code,
        stock: data.stock,
        is_active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onVariantsChange?.();
      toast({ title: "Variante actualizada" });
      setEditingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProductVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onVariantsChange?.();
      toast({ title: "Variante eliminada" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
    },
  });

  const startEditing = (variant: ProductVariant) => {
    setEditingId(variant.id);
    setEditForm({
      color_name: variant.color_name,
      color_code: variant.color_code,
      stock: variant.stock_quantity || variant.stock || 0,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({ color_name: "", color_code: "#000000", stock: 0 });
  };

  const handleSave = () => {
    if (!editForm.color_name.trim()) {
      toast({ title: "Ingresa un nombre de color", variant: "destructive" });
      return;
    }

    if (isAdding) {
      createMutation.mutate(editForm);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, data: editForm });
    }
  };

  const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || v.stock || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Variantes de color</CardTitle>
          <p className="text-sm text-muted-foreground">
            Stock total: {totalStock} unidades
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* New variant row */}
            {isAdding && (
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.color_code}
                      onChange={(e) =>
                        setEditForm({ ...editForm, color_code: e.target.value })
                      }
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <Input
                      value={editForm.color_code}
                      onChange={(e) =>
                        setEditForm({ ...editForm, color_code: e.target.value })
                      }
                      className="w-24 font-mono text-xs"
                      placeholder="#000000"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={editForm.color_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, color_name: e.target.value })
                    }
                    placeholder="Ej: Rojo Vino"
                    autoFocus
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) =>
                      setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSave}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEditing}>
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Existing variants */}
            {variants.map((variant) => (
              <TableRow key={variant.id}>
                <TableCell>
                  {editingId === variant.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editForm.color_code}
                        onChange={(e) =>
                          setEditForm({ ...editForm, color_code: e.target.value })
                        }
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <Input
                        value={editForm.color_code}
                        onChange={(e) =>
                          setEditForm({ ...editForm, color_code: e.target.value })
                        }
                        className="w-24 font-mono text-xs"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: variant.color_code }}
                      />
                      <span className="font-mono text-xs">{variant.color_code}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === variant.id ? (
                    <Input
                      value={editForm.color_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, color_name: e.target.value })
                      }
                    />
                  ) : (
                    variant.color_name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === variant.id ? (
                    <Input
                      type="number"
                      min="0"
                      value={editForm.stock}
                      onChange={(e) =>
                        setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })
                      }
                      className="w-20"
                    />
                  ) : (
                    variant.stock_quantity || variant.stock || 0
                  )}
                </TableCell>
                <TableCell>
                  {editingId === variant.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEditing}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(variant)}
                        disabled={isAdding || editingId !== null}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Eliminar esta variante?")) {
                            deleteMutation.mutate(variant.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {variants.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay variantes. Agrega colores para este producto.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
