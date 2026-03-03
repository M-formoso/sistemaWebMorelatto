import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}
