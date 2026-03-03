"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ContactoPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular envío
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: "Mensaje enviado",
      description: "Te responderemos a la brevedad. ¡Gracias por contactarnos!",
    });

    setFormData({ name: "", email: "", phone: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl font-bold">Contactanos</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          ¿Tenés alguna consulta? Estamos para ayudarte. Completá el formulario
          o contactanos por los medios disponibles.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Envianos un mensaje</CardTitle>
            <CardDescription>
              Completá el formulario y te responderemos a la brevedad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="¿En qué podemos ayudarte?"
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar mensaje
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <a
                  href="mailto:info@morelattolanas.com"
                  className="text-muted-foreground hover:text-primary"
                >
                  info@morelattolanas.com
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Teléfono / WhatsApp</h3>
                <a
                  href="tel:+5491112345678"
                  className="text-muted-foreground hover:text-primary"
                >
                  +54 9 11 1234-5678
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ubicación</h3>
                <p className="text-muted-foreground">Buenos Aires, Argentina</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-morelatto-cream/50">
            <CardContent className="p-6">
              <h3 className="font-semibold">Horario de atención</h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>Lunes a Viernes: 9:00 - 18:00</p>
                <p>Sábados: 10:00 - 14:00</p>
                <p>Domingos y feriados: Cerrado</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
