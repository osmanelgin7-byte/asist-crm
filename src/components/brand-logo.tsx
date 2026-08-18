import Image from "next/image";
import { cn } from "@/lib/utils";
import { APP_NAME, LOGO_PATH } from "@/lib/brand";

interface BrandLogoProps {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function BrandLogo({ className, width = 180, height = 52, priority = false }: BrandLogoProps) {
  return (
    <Image
      src={LOGO_PATH}
      alt={APP_NAME}
      width={width}
      height={height}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
