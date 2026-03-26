import { cn } from "@/lib/utils";

interface SiteLogoProps {
  className?: string;
}

export function SiteLogo({ className }: SiteLogoProps) {
  return (
    <img
      src="/study-icon.svg"
      alt="Logo do Meu Caderno de Estudos"
      className={cn("h-16 w-16 object-contain", className)}
      loading="eager"
      decoding="async"
    />
  );
}
