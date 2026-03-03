import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, Truck, Award, Users } from "lucide-react";

const features = [
  {
    icon: Heart,
    title: "Hecho con amor",
    description: "Cada producto es seleccionado con cariño pensando en vos",
  },
  {
    icon: Truck,
    title: "Envíos a todo el país",
    description: "Llegamos a donde estés con envíos seguros y rápidos",
  },
  {
    icon: Award,
    title: "Calidad premium",
    description: "Las mejores marcas y materiales para tus proyectos",
  },
  {
    icon: Users,
    title: "Comunidad tejedora",
    description: "Formá parte de nuestra comunidad de tejedoras",
  },
];

export function AboutPreview() {
  return (
    <section className="bg-morelatto-cream/30 py-16 md:py-24">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div className="flex flex-col justify-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Sobre nosotros
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              En Morelatto Lanas creemos que tejer es mucho más que un hobby: es
              una forma de expresión, de conexión y de crear algo único con tus
              propias manos.
            </p>
            <p className="mt-4 text-muted-foreground">
              Desde nuestros inicios, nos dedicamos a seleccionar las mejores
              lanas y materiales para que puedas dar vida a todos tus proyectos.
              Además, con nuestros talleres presenciales y online, te
              acompañamos en cada paso de tu camino como tejedora.
            </p>
            <div className="mt-8">
              <Button asChild>
                <Link href="/nosotros">Conocenos más</Link>
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
