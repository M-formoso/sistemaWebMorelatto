"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-morelatto-cream to-background">
      <div className="container relative z-10 py-20 md:py-32">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Content */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Tejé con{" "}
                <span className="text-morelatto-orange">amor</span>,{" "}
                creá con{" "}
                <span className="text-morelatto-orange">pasión</span>
              </h1>
              <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
                Descubrí nuestra selección de lanas premium y participá de
                nuestros talleres para aprender técnicas únicas de tejido
                artesanal.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/productos">
                  Ver productos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/talleres">Explorar talleres</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-3xl font-bold text-morelatto-orange">500+</p>
                <p className="text-sm text-muted-foreground">Productos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-morelatto-orange">50+</p>
                <p className="text-sm text-muted-foreground">Talleres</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-morelatto-orange">1000+</p>
                <p className="text-sm text-muted-foreground">Clientes felices</p>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 h-32 w-32 rounded-full bg-morelatto-orange/20 mx-auto flex items-center justify-center">
                    <span className="font-display text-4xl text-morelatto-orange">M</span>
                  </div>
                  <p className="text-muted-foreground">Imagen del hero</p>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-morelatto-orange/20" />
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-morelatto-orange/10" />
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-morelatto-orange/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-morelatto-orange/5 blur-3xl" />
      </div>
    </section>
  );
}
