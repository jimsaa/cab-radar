import Image from "next/image";
import { APP_NAME, APP_SLOGAN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FeatureHighlights } from "./FeatureHighlights";

interface BrandHeaderProps {
  logoSize?: number;
  title?: string;
  className?: string;
  showFeatures?: boolean;
}

export function BrandHeader({
  logoSize = 80,
  title,
  className,
  showFeatures = true,
}: BrandHeaderProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <Image
        src="/logo.png"
        alt={APP_NAME}
        width={logoSize}
        height={logoSize}
        className="rounded-2xl"
        priority
      />
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
        {APP_SLOGAN}
      </p>
      {showFeatures && <FeatureHighlights />}
      {title && <h1 className="mt-5 text-2xl font-bold">{title}</h1>}
    </div>
  );
}
