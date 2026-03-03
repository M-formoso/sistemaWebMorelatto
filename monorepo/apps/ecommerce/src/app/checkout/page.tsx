"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  CreditCard,
  Truck,
  MapPin,
  User,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { api } from "@morelatto/api-client";

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  estimated_days?: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, totalWeight, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [customerData, setCustomerData] = useState({
    email: user?.email || "",
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    document: "",
  });

  const [shippingData, setShippingData] = useState({
    street: "",
    number: "",
    floor: "",
    apartment: "",
    city: "",
    province: "",
    postal_code: "",
    notes: "",
  });

  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [shippingCost, setShippingCost] = useState(0);

  // Fetch shipping rates
  const { data: shippingRates } = useQuery({
    queryKey: ["shipping-rates", shippingData.city, shippingData.province],
    queryFn: async () => {
      if (!shippingData.city || !shippingData.province) return [];
      const result = await api.calculateShipping({
        city: shippingData.city,
        province: shippingData.province,
        total_weight: totalWeight(),
        order_total: totalPrice(),
      });
      return result.rates || [];
    },
    enabled: !!shippingData.city && !!shippingData.province,
  });

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api.getPaymentMethods(),
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        customer_email: customerData.email,
        customer_name: customerData.full_name,
        customer_phone: customerData.phone,
        customer_document: customerData.document,
        shipping_address: `${shippingData.street} ${shippingData.number}${
          shippingData.floor ? `, Piso ${shippingData.floor}` : ""
        }${shippingData.apartment ? `, Depto ${shippingData.apartment}` : ""}`,
        shipping_city: shippingData.city,
        shipping_province: shippingData.province,
        shipping_postal_code: shippingData.postal_code,
        shipping_notes: shippingData.notes,
        shipping_method_id: selectedShipping,
        shipping_cost: shippingCost,
        payment_method_id: selectedPayment,
        items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      return api.createOrder(orderData);
    },
    onSuccess: async (order) => {
      // Check if payment method is MercadoPago
      const paymentMethod = paymentMethods?.find(
        (pm: PaymentMethod) => pm.id === selectedPayment
      );

      if (paymentMethod?.type === "mercadopago") {
        // Create MercadoPago preference
        try {
          const preference = await api.createPaymentPreference({
            order_id: order.id,
            items: items.map((item) => ({
              title: item.name,
              quantity: item.quantity,
              unit_price: item.price,
            })),
            payer: {
              name: customerData.full_name.split(" ")[0],
              surname: customerData.full_name.split(" ").slice(1).join(" "),
              email: customerData.email,
            },
          });

          // Redirect to MercadoPago
          if (preference.init_point) {
            clearCart();
            window.location.href = preference.init_point;
            return;
          }
        } catch (error) {
          console.error("Error creating payment preference:", error);
        }
      }

      // For other payment methods, just show success
      clearCart();
      router.push(`/checkout/confirmacion?order=${order.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear el pedido",
        description: error.message || "Por favor, intentá de nuevo",
        variant: "destructive",
      });
    },
  });

  // Update shipping cost when rate changes
  useEffect(() => {
    if (selectedShipping && shippingRates) {
      const rate = shippingRates.find((r: ShippingRate) => r.id === selectedShipping);
      setShippingCost(rate?.price || 0);
    }
  }, [selectedShipping, shippingRates]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/productos");
    }
  }, [items, router]);

  if (items.length === 0) {
    return null;
  }

  const subtotal = totalPrice();
  const total = subtotal + shippingCost;

  const handleSubmit = () => {
    if (step === 1) {
      // Validate customer data
      if (!customerData.email || !customerData.full_name || !customerData.phone) {
        toast({
          title: "Completá tus datos",
          description: "Por favor completá todos los campos obligatorios",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate shipping data
      if (
        !shippingData.street ||
        !shippingData.number ||
        !shippingData.city ||
        !shippingData.province ||
        !shippingData.postal_code
      ) {
        toast({
          title: "Completá la dirección",
          description: "Por favor completá todos los campos de envío",
          variant: "destructive",
        });
        return;
      }
      if (!selectedShipping) {
        toast({
          title: "Seleccioná un método de envío",
          description: "Por favor elegí cómo querés recibir tu pedido",
          variant: "destructive",
        });
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Validate payment
      if (!selectedPayment) {
        toast({
          title: "Seleccioná un método de pago",
          description: "Por favor elegí cómo querés pagar",
          variant: "destructive",
        });
        return;
      }
      createOrderMutation.mutate();
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/productos">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Seguir comprando
          </Link>
        </Button>
        <h1 className="mt-4 font-display text-3xl font-bold">Checkout</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={step >= 1 ? "font-medium text-primary" : "text-muted-foreground"}
            >
              1. Datos
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={step >= 2 ? "font-medium text-primary" : "text-muted-foreground"}
            >
              2. Envío
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={step >= 3 ? "font-medium text-primary" : "text-muted-foreground"}
            >
              3. Pago
            </span>
          </div>

          {/* Step 1: Customer Data */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Tus datos
                </CardTitle>
                <CardDescription>
                  Completá tus datos de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerData.email}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, email: e.target.value })
                      }
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, phone: e.target.value })
                      }
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={customerData.full_name}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, full_name: e.target.value })
                      }
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document">DNI/CUIT (opcional)</Label>
                    <Input
                      id="document"
                      value={customerData.document}
                      onChange={(e) =>
                        setCustomerData({ ...customerData, document: e.target.value })
                      }
                      placeholder="12345678"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Dirección de envío
                </CardTitle>
                <CardDescription>
                  ¿A dónde enviamos tu pedido?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="street">Calle *</Label>
                    <Input
                      id="street"
                      value={shippingData.street}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, street: e.target.value })
                      }
                      placeholder="Av. Corrientes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={shippingData.number}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, number: e.target.value })
                      }
                      placeholder="1234"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="floor">Piso (opcional)</Label>
                    <Input
                      id="floor"
                      value={shippingData.floor}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, floor: e.target.value })
                      }
                      placeholder="3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apartment">Depto (opcional)</Label>
                    <Input
                      id="apartment"
                      value={shippingData.apartment}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, apartment: e.target.value })
                      }
                      placeholder="A"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      value={shippingData.city}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, city: e.target.value })
                      }
                      placeholder="Buenos Aires"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia *</Label>
                    <Input
                      id="province"
                      value={shippingData.province}
                      onChange={(e) =>
                        setShippingData({ ...shippingData, province: e.target.value })
                      }
                      placeholder="Buenos Aires"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código postal *</Label>
                    <Input
                      id="postal_code"
                      value={shippingData.postal_code}
                      onChange={(e) =>
                        setShippingData({
                          ...shippingData,
                          postal_code: e.target.value,
                        })
                      }
                      placeholder="1414"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas de envío (opcional)</Label>
                  <Input
                    id="notes"
                    value={shippingData.notes}
                    onChange={(e) =>
                      setShippingData({ ...shippingData, notes: e.target.value })
                    }
                    placeholder="Timbre, horarios, etc."
                  />
                </div>

                {/* Shipping options */}
                {shippingRates && shippingRates.length > 0 && (
                  <div className="space-y-2 pt-4">
                    <Label>Método de envío *</Label>
                    <RadioGroup
                      value={selectedShipping}
                      onValueChange={setSelectedShipping}
                    >
                      {shippingRates.map((rate: ShippingRate) => (
                        <div
                          key={rate.id}
                          className="flex items-center space-x-3 rounded-lg border p-4"
                        >
                          <RadioGroupItem value={rate.id} id={rate.id} />
                          <Label
                            htmlFor={rate.id}
                            className="flex flex-1 cursor-pointer items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              <span>{rate.name}</span>
                              {rate.estimated_days && (
                                <span className="text-sm text-muted-foreground">
                                  ({rate.estimated_days} días)
                                </span>
                              )}
                            </div>
                            <span className="font-medium">
                              {rate.price === 0 ? "Gratis" : formatPrice(rate.price)}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de pago
                </CardTitle>
                <CardDescription>
                  ¿Cómo preferís pagar?
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentMethods && paymentMethods.length > 0 ? (
                  <RadioGroup
                    value={selectedPayment}
                    onValueChange={setSelectedPayment}
                  >
                    {paymentMethods
                      .filter((pm: PaymentMethod) => pm.is_active)
                      .map((pm: PaymentMethod) => (
                        <div
                          key={pm.id}
                          className="flex items-center space-x-3 rounded-lg border p-4"
                        >
                          <RadioGroupItem value={pm.id} id={pm.id} />
                          <Label
                            htmlFor={pm.id}
                            className="flex flex-1 cursor-pointer items-center gap-3"
                          >
                            {pm.type === "mercadopago" ? (
                              <span className="text-2xl">💳</span>
                            ) : pm.type === "transfer" ? (
                              <span className="text-2xl">🏦</span>
                            ) : (
                              <span className="text-2xl">💵</span>
                            )}
                            <span>{pm.name}</span>
                          </Label>
                        </div>
                      ))}
                  </RadioGroup>
                ) : (
                  <p className="text-muted-foreground">
                    No hay métodos de pago disponibles
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex gap-4">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Volver
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : step === 3 ? (
                "Confirmar pedido"
              ) : (
                "Continuar"
              )}
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xl">
                          🧶
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      {item.variant_name && (
                        <p className="text-xs text-muted-foreground">
                          {item.variant_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x {formatPrice(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Envío</span>
                  <span>
                    {shippingCost > 0 ? formatPrice(shippingCost) : "A calcular"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
