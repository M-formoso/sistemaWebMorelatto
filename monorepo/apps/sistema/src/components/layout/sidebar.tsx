"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  FileText,
  Settings,
  Truck,
  CreditCard,
  BarChart3,
  Tags,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Productos", href: "/productos", icon: Package },
  { name: "Categorías", href: "/categorias", icon: Tags },
  { name: "Pedidos Web", href: "/pedidos", icon: ShoppingCart },
  { name: "Ventas Local", href: "/ventas", icon: CreditCard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Talleres", href: "/talleres", icon: Calendar },
  { name: "Proveedores", href: "/proveedores", icon: Building2 },
  { name: "Envíos", href: "/envios", icon: Truck },
  { name: "Reportes", href: "/reportes", icon: BarChart3 },
  { name: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-lg font-bold">M</span>
            </div>
            <span className="text-lg font-semibold">Morelatto</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <span className="text-sm font-medium">
                {user?.full_name?.[0] || user?.email?.[0] || "U"}
              </span>
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">
                {user?.full_name || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
