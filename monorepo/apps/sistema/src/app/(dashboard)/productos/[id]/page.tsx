"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Loader2,
  Globe,
  EyeOff,
  Trash2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ProductForm, ProductFormData } from "@/components/products/product-form";
import { ImageManager } from "@/components/products/image-manager";
import { VariantManager } from "@/components/products/variant-manager";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

export default function EditarProductoPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const productId = params.id as string;

  const [formData, setFormData] = useState<ProductFormData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishCategoryId, setPublishCategoryId] = useState<string>("");

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
    enabled: !!productId,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  // Set initial form data when product loads
  useEffect(() => {
    if (product && !formData) {
      setFormData({
        name: product.name || "",
        code: product.code || "",
        description: product.description || "",
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
        stock: product.stock || 0,
        stock_min: product.stock_min || 5,
        weight: parseFloat(product.weight) || 0,
        color: product.color || "",
        category_id: product.category_id || "",
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
        show_in_decoration: product.show_in_decoration ?? false,
      });
      setPublishCategoryId(product.category_id || "");
    }
  }, [product, formData]);

  const updateMutation = useMutation({
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
      return api.updateProduct(productId, productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto actualizado" });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return api.publishProductToWeb(productId, { category_id: categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto publicado en la web" });
      setShowPublishDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al publicar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto despublicado de la web" });
    },
    onError: (error: any) => {
      toast({
        title: "Error al despublicar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProduct(productId),
    onSuccess: () => {
      toast({ title: "Producto eliminado" });
      router.push("/productos");
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFormChange = (data: ProductFormData) => {
    setFormData(data);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!formData) return;

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

    updateMutation.mutate(formData);
  };

  const handlePublish = () => {
    if (!publishCategoryId) {
      toast({ title: "Selecciona una categoria", variant: "destructive" });
      return;
    }
    publishMutation.mutate(publishCategoryId);
  };

  const handleDelete = () => {
    if (confirm("Estas seguro de eliminar este producto? Esta accion no se puede deshacer.")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button asChild className="mt-4">
          <Link href="/productos">Volver a productos</Link>
        </Button>
      </div>
    );
  }

  const isPublished = product.is_active && product.category_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/productos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {isPublished ? (
                <Badge className="bg-green-600">
                  <Globe className="h-3 w-3 mr-1" />
                  Publicado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <EyeOff className="h-3 w-3 mr-1" />
                  No publicado
                </Badge>
              )}
              {product.is_featured && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Destacado
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Codigo: {product.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Publish/Unpublish buttons */}
          {isPublished ? (
            <Button
              variant="outline"
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <EyeOff className="h-4 w-4 mr-2" />
              )}
              Despublicar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(true)}
            >
              <Globe className="h-4 w-4 mr-2" />
              Publicar en web
            </Button>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !hasChanges}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>

          {/* Delete button */}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informacion</TabsTrigger>
          <TabsTrigger value="images">
            Imagenes ({product.images?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="variants">
            Variantes ({product.variants?.length || product.product_variants?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ProductForm
            initialData={formData || undefined}
            onChange={handleFormChange}
            disabled={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="images">
          <ImageManager
            productId={productId}
            images={product.images || []}
            onImagesChange={() => {
              queryClient.invalidateQueries({ queryKey: ["product", productId] });
            }}
          />
        </TabsContent>

        <TabsContent value="variants">
          <VariantManager
            productId={productId}
            variants={product.variants || product.product_variants || []}
            onVariantsChange={() => {
              queryClient.invalidateQueries({ queryKey: ["product", productId] });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar producto en la web</DialogTitle>
            <DialogDescription>
              Selecciona la categoria donde aparecera este producto en la tienda online.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={publishCategoryId}
                onValueChange={setPublishCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending || !publishCategoryId}
            >
              {publishMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Publicar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
