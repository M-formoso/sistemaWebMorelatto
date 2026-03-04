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
  Newspaper,
  Eye,
  EyeOff,
  Calendar,
  ImageIcon,
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface NewsForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  is_published: boolean;
  published_at: string;
}

const defaultForm: NewsForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image_url: "",
  is_published: false,
  published_at: new Date().toISOString().split("T")[0],
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NoticiasPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsForm>(defaultForm);

  const { data: news, isLoading } = useQuery({
    queryKey: ["news", search],
    queryFn: () => api.getNews({ search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: NewsForm) => api.createNews(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast({ title: "Noticia creada" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: NewsForm }) =>
      api.updateNews(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast({ title: "Noticia actualizada" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNews(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast({ title: "Noticia eliminada" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }: { id: string; is_published: boolean }) =>
      api.updateNews(id, { is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast({ title: "Estado actualizado" });
    },
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug || "",
      excerpt: item.excerpt || "",
      content: item.content || "",
      image_url: item.image_url || "",
      is_published: item.is_published ?? false,
      published_at: item.published_at
        ? new Date(item.published_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleTitleChange = (value: string) => {
    setForm({
      ...form,
      title: value,
      slug: editingId ? form.slug : generateSlug(value),
    });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast({ title: "El título es requerido", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const newsList = news || [];
  const publishedCount = newsList.filter((n: any) => n.is_published).length;
  const draftCount = newsList.filter((n: any) => !n.is_published).length;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Noticias</h1>
          <p className="text-muted-foreground">
            Administra las noticias y novedades del sitio
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva noticia
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total noticias</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newsList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicadas</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar noticias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando noticias...
            </div>
          ) : newsList.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newsList.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-10 w-14 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded bg-muted">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.title}</p>
                          {item.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {item.excerpt}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {item.published_at
                          ? format(new Date(item.published_at), "dd MMM yyyy", {
                              locale: es,
                            })
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.is_published}
                          onCheckedChange={(checked) =>
                            togglePublishMutation.mutate({
                              id: item.id,
                              is_published: checked,
                            })
                          }
                        />
                        <Badge variant={item.is_published ? "default" : "secondary"}>
                          {item.is_published ? "Publicada" : "Borrador"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("¿Eliminar esta noticia?")) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
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
              No hay noticias. Crea la primera.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar noticia" : "Nueva noticia"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título de la noticia"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="url-de-la-noticia"
              />
              <p className="text-xs text-muted-foreground">
                Se genera automáticamente desde el título
              </p>
            </div>

            <div className="space-y-2">
              <Label>Extracto</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                placeholder="Breve descripción de la noticia..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Contenido completo de la noticia..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>URL de imagen</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="mt-2 h-32 w-full rounded object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de publicación</Label>
                <Input
                  type="date"
                  value={form.published_at}
                  onChange={(e) =>
                    setForm({ ...form, published_at: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Publicar ahora</Label>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_published: checked })
                  }
                />
              </div>
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
    </div>
  );
}
