"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Upload, X, Star, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  alt_text?: string;
}

interface ImageManagerProps {
  productId: string;
  images: ProductImage[];
  onImagesChange?: () => void;
}

export function ImageManager({ productId, images, onImagesChange }: ImageManagerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await api.uploadImage(formData);

      // Agregar imagen al producto (backend devuelve image_url, no url)
      await api.addProductImage(productId, {
        image_url: uploadResult.image_url || uploadResult.url,
        is_primary: images.length === 0,
        display_order: images.length,
      });

      return uploadResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onImagesChange?.();
      toast({ title: "Imagen subida correctamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error al subir imagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: string) => api.setPrimaryImage(productId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onImagesChange?.();
      toast({ title: "Imagen principal actualizada" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => api.deleteProductImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      onImagesChange?.();
      toast({ title: "Imagen eliminada" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMutation.mutateAsync(file);
      }
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Imagenes del producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="image-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Subiendo...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click para subir imagenes
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG hasta 5MB
                </span>
              </>
            )}
          </label>
        </div>

        {/* Images grid */}
        {sortedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sortedImages.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border bg-muted aspect-square"
              >
                <Image
                  src={api.getImageUrl(image.image_url) || ""}
                  alt={image.alt_text || "Producto"}
                  fill
                  className="object-cover"
                />

                {/* Primary badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Principal
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.is_primary && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPrimaryMutation.mutate(image.id)}
                      disabled={setPrimaryMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Eliminar esta imagen?")) {
                        deleteMutation.mutate(image.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedImages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay imagenes. Subi la primera imagen del producto.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
