"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils";

export default function CarritoPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, totalPrice, clearCart, totalItems } = useCartStore();

  const total = totalPrice();
  const count = totalItems();

  // Redirect to products if cart is empty
  useEffect(() => {
    // Small delay to allow hydration
    const timer = setTimeout(() => {
      if (count === 0) {
        // Don't redirect, show empty state instead
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-800 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-8 w-8" />
            Carrito de Compras
          </h1>
          <p className="text-amber-100 mt-1">
            {count === 0
              ? "Tu carrito esta vacio"
              : `${count} producto${count > 1 ? "s" : ""} en tu carrito`}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {count === 0 ? (
          <div className="text-center py-16">
            <div className="bg-amber-50 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-amber-800" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Tu carrito esta vacio
            </h2>
            <p className="text-gray-600 mb-6">
              Agrega productos para comenzar tu compra
            </p>
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition-colors"
            >
              <Package className="h-5 w-5" />
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Productos</h2>
                  <button
                    onClick={() => {
                      if (confirm("Vaciar el carrito?")) {
                        clearCart();
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Vaciar carrito
                  </button>
                </div>

                <ul className="divide-y">
                  {items.map((item) => (
                    <li key={item.id} className="p-4 flex gap-4">
                      {/* Image */}
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            {item.variant_name && (
                              <p className="text-sm text-gray-500">{item.variant_name}</p>
                            )}
                            <p className="text-sm text-amber-800 font-medium mt-1">
                              {formatPrice(item.price)} c/u
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-2">
                          {/* Quantity */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Subtotal */}
                          <p className="font-bold text-gray-900">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Continue shopping */}
              <Link
                href="/productos"
                className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-900 transition-colors mt-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Seguir comprando
              </Link>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="font-semibold text-gray-900 mb-4">Resumen del pedido</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({count} productos)</span>
                    <span className="font-medium">{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Envio</span>
                    <span className="text-gray-500">A calcular</span>
                  </div>
                </div>

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-amber-800">{formatPrice(total)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    * El costo de envio se calcula en el checkout
                  </p>
                </div>

                <Button
                  className="w-full mt-6 bg-amber-800 hover:bg-amber-900"
                  size="lg"
                  onClick={() => router.push("/checkout")}
                >
                  Finalizar compra
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {/* Security badges */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Compra segura - Datos protegidos
                  </p>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      SSL
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Seguro
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
