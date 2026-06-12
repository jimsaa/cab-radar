import Image from "next/image";
import Link from "next/link";
import type { BannerAd } from "@/lib/types/database";

export function BannerSlot({ banner }: { banner: BannerAd | null }) {
  if (!banner) return null;

  const content = (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-xl border border-card-border">
      <Image
        src={banner.image_url}
        alt={banner.title || "Annons"}
        width={800}
        height={120}
        className="h-auto w-full object-cover"
        unoptimized
      />
    </div>
  );

  if (banner.link_url) {
    return (
      <Link href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block px-4 py-2">
        {content}
      </Link>
    );
  }

  return <div className="px-4 py-2">{content}</div>;
}
