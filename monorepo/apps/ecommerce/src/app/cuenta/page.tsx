"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export default function CuentaPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, updateUser } = useAuthStore();
  const { items: favorites } = useFavoritesStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => api.getMyOrders(),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/cuenta");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!formData.full_name.trim()) return;

    setIsSaving(true);
    try {
      // Update local state
      updateUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-800" />
      </div>
    );
  }

  const orderCount = orders?.length || 0;
  const pendingOrders = orders?.filter((o: any) =>
    o.status !== "delivered" && o.status !== "cancelled"
  ).length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">Mi Cuenta</h1>
          <p className="text-amber-100 mt-1">
            Bienvenido, {user?.full_name || "Usuario"}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Sidebar - Profile */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Avatar */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl font-bold text-amber-800">
                    {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-center"
                      placeholder="Tu nombre"
                    />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-center"
                      placeholder="Tu teléfono"
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 flex items-center gap-1"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {user?.full_name || "Sin nombre"}
                    </h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-amber-800 text-sm hover:underline flex items-center gap-1 justify-center mt-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      Editar perfil
                    </button>
                  </>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full mt-6 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4 text-center">
                <Package className="h-6 w-6 mx-auto text-amber-800 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
                <p className="text-sm text-gray-500">Pedidos</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4 text-center">
                <Package className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
                <p className="text-sm text-gray-500">En curso</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4 text-center">
                <Heart className="h-6 w-6 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold text-gray-900">{favorites.length}</p>
                <p className="text-sm text-gray-500">Favoritos</p>
              </div>
            </div>

            {/* Menu links */}
            <div className="bg-white rounded-lg shadow-md divide-y">
              <Link
                href="/cuenta/pedidos"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-amber-800" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Mis Pedidos</p>
                    <p className="text-sm text-gray-500">Ver historial y estado de compras</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>

              <Link
                href="/cuenta/favoritos"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Favoritos</p>
                    <p className="text-sm text-gray-500">Productos guardados</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>

              <Link
                href="/productos"
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Settings className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Seguir comprando</p>
                    <p className="text-sm text-gray-500">Explorar productos</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            </div>

            {/* Recent orders preview */}
            {orders && orders.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Últimos pedidos</h3>
                  <Link href="/cuenta/pedidos" className="text-amber-800 text-sm hover:underline">
                    Ver todos
                  </Link>
                </div>
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          Pedido #{order.order_number || order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.items?.length || 0} productos
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "delivered"
                            ? "bg-green-100 text-green-800"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.status === "delivered"
                          ? "Entregado"
                          : order.status === "cancelled"
                          ? "Cancelado"
                          : order.status === "shipped"
                          ? "Enviado"
                          : "En proceso"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
