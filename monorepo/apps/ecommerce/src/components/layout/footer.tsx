import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, Mail, MapPin, Phone } from "lucide-react";

const footerLinks = {
  tienda: [
    { name: "Productos", href: "/productos" },
    { name: "Talleres", href: "/talleres" },
    { name: "Novedades", href: "/novedades" },
  ],
  informacion: [
    { name: "Nosotros", href: "/nosotros" },
    { name: "Contacto", href: "/contacto" },
    { name: "Preguntas frecuentes", href: "/faq" },
  ],
  legal: [
    { name: "Términos y condiciones", href: "/terminos" },
    { name: "Política de privacidad", href: "/privacidad" },
    { name: "Cambios y devoluciones", href: "/cambios" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-morelatto-cream/50">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Morelatto Lanas"
                width={120}
                height={45}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              Lanas de alta calidad y talleres de tejido para crear con amor.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com/morelattolanas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a
                href="https://facebook.com/morelattolanas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </a>
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Tienda</h3>
            <ul className="space-y-3">
              {footerLinks.tienda.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Información */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Información</h3>
            <ul className="space-y-3">
              {footerLinks.informacion.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Contacto</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:info@morelattolanas.com" className="hover:text-primary">
                  info@morelattolanas.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:+5491112345678" className="hover:text-primary">
                  +54 9 11 1234-5678
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>Buenos Aires, Argentina</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Morelatto Lanas. Todos los derechos reservados.
            </p>
            <div className="flex gap-4">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
