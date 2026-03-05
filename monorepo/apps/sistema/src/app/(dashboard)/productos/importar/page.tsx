"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import {
  Upload,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export default function ImportarProductosPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const token = api.getToken();
      const response = await fetch(
        `${(api as any).baseUrl}/import-export/products/import?update_existing=${updateExisting}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error al importar");
      }

      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (result.errors.length === 0) {
        toast({
          title: "Importacion completada",
          description: `${result.created} creados, ${result.updated} actualizados`,
        });
      } else {
        toast({
          title: "Importacion completada con errores",
          description: `${result.created} creados, ${result.skipped} omitidos`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Formato incorrecto",
          description: "Solo se permiten archivos CSV",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = api.getToken();
      const response = await fetch(
        `${(api as any).baseUrl}/import-export/products/template`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Error al descargar");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_productos.csv";
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Plantilla descargada" });
    } catch (error) {
      toast({
        title: "Error al descargar plantilla",
        variant: "destructive",
      });
    }
  };

  const handleExportProducts = async () => {
    try {
      const token = api.getToken();
      const response = await fetch(
        `${(api as any).baseUrl}/import-export/products/export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Error al exportar");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `productos_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Productos exportados" });
    } catch (error) {
      toast({
        title: "Error al exportar productos",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/productos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar / Exportar Productos</h1>
          <p className="text-muted-foreground">
            Carga masiva de productos mediante archivos CSV
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Importar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Productos
            </CardTitle>
            <CardDescription>
              Subi un archivo CSV con los productos a importar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Area de upload */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {selectedFile ? (
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click para seleccionar archivo</p>
                  <p className="text-sm text-muted-foreground">
                    Solo archivos .csv
                  </p>
                </div>
              )}
            </div>

            {/* Opciones */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Actualizar existentes</Label>
                <p className="text-xs text-muted-foreground">
                  Si el codigo ya existe, actualiza el producto
                </p>
              </div>
              <Switch
                checked={updateExisting}
                onCheckedChange={setUpdateExisting}
              />
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                className="flex-1"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Plantilla
              </Button>
            </div>

            {/* Resultados */}
            {importResult && (
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium">Resultado de la importacion</h4>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Creados: {importResult.created}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <span>Actualizados: {importResult.updated}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Omitidos: {importResult.skipped}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Total: {importResult.total}
                    </span>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-destructive mb-1">
                      Errores:
                    </p>
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {importResult.errors.map((error, i) => (
                        <div key={i} className="flex items-start gap-1 text-destructive">
                          <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exportar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Productos
            </CardTitle>
            <CardDescription>
              Descarga todos los productos en formato CSV
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Exporta todos los productos del sistema a un archivo CSV que
                podes editar y volver a importar
              </p>
              <Button onClick={handleExportProducts} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Exportar Productos
              </Button>
            </div>

            {/* Instrucciones */}
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <h4 className="font-medium">Formato del CSV</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>codigo</strong>: Identificador unico (requerido)</li>
                <li><strong>nombre</strong>: Nombre del producto (requerido)</li>
                <li><strong>precio</strong>: Precio de venta (requerido)</li>
                <li><strong>descripcion</strong>: Descripcion del producto</li>
                <li><strong>costo</strong>: Precio de costo</li>
                <li><strong>stock</strong>: Cantidad disponible</li>
                <li><strong>stock_minimo</strong>: Alerta de stock bajo</li>
                <li><strong>peso_gramos</strong>: Peso en gramos</li>
                <li><strong>color</strong>: Color del producto</li>
                <li><strong>categoria</strong>: Nombre de categoria</li>
                <li><strong>activo</strong>: Si/No</li>
                <li><strong>destacado</strong>: Si/No</li>
                <li><strong>mostrar_decoracion</strong>: Si/No</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
