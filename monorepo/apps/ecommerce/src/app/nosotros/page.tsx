import Image from "next/image";
import { Heart, Users, Award, Sparkles } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Pasión por el tejido",
    description:
      "Creemos que tejer es una forma de arte que conecta generaciones y crea vínculos únicos.",
  },
  {
    icon: Users,
    title: "Comunidad",
    description:
      "Formamos una comunidad de tejedoras que comparten su pasión, conocimientos y creaciones.",
  },
  {
    icon: Award,
    title: "Calidad",
    description:
      "Seleccionamos cuidadosamente cada producto para garantizar la mejor experiencia de tejido.",
  },
  {
    icon: Sparkles,
    title: "Creatividad",
    description:
      "Fomentamos la creatividad y la expresión personal a través de cada proyecto.",
  },
];

export default function NosotrosPage() {
  return (
    <div className="container py-12">
      {/* Hero */}
      <section className="mb-16 text-center">
        <h1 className="font-display text-4xl font-bold md:text-5xl">
          Sobre Morelatto Lanas
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Somos una tienda especializada en lanas de alta calidad y talleres de
          tejido. Nuestra misión es inspirar y acompañar a cada tejedora en su
          camino creativo.
        </p>
      </section>

      {/* Story */}
      <section className="mb-16 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted lg:aspect-auto">
          <div className="flex h-full items-center justify-center">
            <span className="text-8xl">🧶</span>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="font-display text-3xl font-bold">Nuestra historia</h2>
          <div className="mt-4 space-y-4 text-muted-foreground">
            <p>
              Morelatto Lanas nació de una pasión familiar por el tejido que se
              transmitió de generación en generación. Lo que comenzó como un
              pequeño emprendimiento casero, hoy se ha convertido en un espacio
              donde tejedoras de todo el país encuentran inspiración y
              materiales de calidad.
            </p>
            <p>
              Creemos firmemente que el tejido es mucho más que un hobby: es una
              forma de meditación, de expresión creativa y de conexión con
              nosotras mismas y con los demás.
            </p>
            <p>
              Cada lana que seleccionamos, cada taller que diseñamos, está
              pensado para brindarte la mejor experiencia y ayudarte a crear
              piezas únicas que perduren en el tiempo.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mb-16">
        <h2 className="mb-8 text-center font-display text-3xl font-bold">
          Nuestros valores
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <value.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">{value.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-morelatto-cream p-8 text-center md:p-12">
        <h2 className="font-display text-2xl font-bold md:text-3xl">
          ¿Querés ser parte de nuestra comunidad?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Seguinos en redes sociales para ver las creaciones de nuestra
          comunidad, enterarte de nuevos productos y talleres, y mucho más.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href="https://instagram.com/morelattolanas"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Instagram
          </a>
          <a
            href="https://facebook.com/morelattolanas"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border bg-background px-6 py-2 font-medium hover:bg-accent"
          >
            Facebook
          </a>
        </div>
      </section>
    </div>
  );
}
