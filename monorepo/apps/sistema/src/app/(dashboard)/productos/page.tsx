"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

export default function ProductosPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () => api.getProducts({ search: search || undefined }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.toggleProductActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto actualizado" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Producto eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", variant: "destructive" });
    },
  });

  const products = data?.items || data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestión del catálogo de productos
          </p>
        </div>
        <Button asChild>
          <Link href="/productos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando productos...
            </div>
          ) : products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: any) => {
                  const primaryImage = product.images?.find((img: any) => img.is_primary)?.url
                    || product.images?.[0]?.url;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                            {primaryImage ? (
                              <Image
                                src={api.getImageUrl(primaryImage) || ""}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-lg">
                                📦
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.category && (
                              <p className="text-sm text-muted-foreground">
                                {product.category.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.code || "-"}
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            product.stock <= 5
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.is_active ? "default" : "secondary"}
                        >
                          {product.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/productos/${product.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActiveMutation.mutate(product.id)}
                            >
                              {product.is_active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("¿Eliminar este producto?")) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
