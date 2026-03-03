"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.login(email, password);
      const user = await api.getMe();
      return { token: response.access_token, user };
    },
    onSuccess: ({ token, user }) => {
      // Verificar que sea admin o staff
      if (!["admin", "staff"].includes(user.role)) {
        toast({
          title: "Acceso denegado",
          description: "No tenés permisos para acceder al sistema",
          variant: "destructive",
        });
        api.logout();
        return;
      }

      setAuth(user, token);
      toast({
        title: "Bienvenido",
        description: `Hola ${user.full_name || user.email}`,
      });
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error de autenticación",
        description: error.message || "Credenciales incorrectas",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="text-3xl font-bold text-primary">M</span>
          </div>
          <CardTitle className="text-2xl">Sistema Morelatto</CardTitle>
          <CardDescription>
            Ingresá tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@morelatto.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Ingresar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
