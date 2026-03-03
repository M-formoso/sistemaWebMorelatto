import { HeroSection } from "@/components/home/hero-section";
import { FeaturedProducts } from "@/components/home/featured-products";
import { CategoriesSection } from "@/components/home/categories-section";
import { WorkshopsPreview } from "@/components/home/workshops-preview";
import { AboutPreview } from "@/components/home/about-preview";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedProducts />
      <CategoriesSection />
      <WorkshopsPreview />
      <AboutPreview />
    </>
  );
}
