"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils";

export function CartSheet() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, totalPrice } =
    useCartStore();

  const total = totalPrice();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Carrito de compras
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Tu carrito está vacío"
              : `${items.length} producto${items.length > 1 ? "s" : ""} en tu carrito`}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No hay productos en tu carrito
            </p>
            <Button onClick={() => setIsOpen(false)} asChild>
              <Link href="/productos">Ver productos</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    {/* Image */}
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div>
                          <h4 className="text-sm font-medium">{item.name}</h4>
                          {item.variant_name && (
                            <p className="text-xs text-muted-foreground">
                              {item.variant_name}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        {/* Quantity */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Price */}
                        <p className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Footer */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between text-base font-medium">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Los costos de envío se calculan en el checkout
              </p>

              <div className="grid gap-2">
                <Button asChild onClick={() => setIsOpen(false)}>
                  <Link href="/checkout">Finalizar compra</Link>
                </Button>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Seguir comprando
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
