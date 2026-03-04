"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductForm, ProductFormData } from "@/components/products/product-form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

export default function NuevoProductoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProductFormData | null>(null);

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const productData = {
        name: data.name,
        code: data.code,
        description: data.description || null,
        price: data.price,
        cost: data.cost || null,
        stock: data.stock,
        stock_min: data.stock_min,
        weight: data.weight || null,
        color: data.color || null,
        category_id: data.category_id || null,
        is_active: data.is_active,
        is_featured: data.is_featured,
        show_in_decoration: data.show_in_decoration,
      };
      return api.createProduct(productData);
    },
    onSuccess: (product) => {
      toast({ title: "Producto creado exitosamente" });
      router.push(`/productos/${product.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear producto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData) {
      toast({ title: "Completa el formulario", variant: "destructive" });
      return;
    }

    if (!formData.name.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    if (!formData.code.trim()) {
      toast({ title: "El codigo es requerido", variant: "destructive" });
      return;
    }

    if (formData.price <= 0) {
      toast({ title: "El precio debe ser mayor a 0", variant: "destructive" });
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/productos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nuevo producto</h1>
            <p className="text-muted-foreground">
              Completa la informacion del nuevo producto
            </p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar producto
            </>
          )}
        </Button>
      </div>

      {/* Form */}
      <ProductForm
        onChange={setFormData}
        disabled={createMutation.isPending}
      />

      <div className="flex justify-end gap-4 pb-8">
        <Button variant="outline" asChild>
          <Link href="/productos">Cancelar</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar producto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
