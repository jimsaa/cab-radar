import {
  adminDriverListLabel,
  adminDriverRealName,
  type DriverIdentity,
} from "@/lib/driver-display";
import { cn } from "@/lib/utils";

interface AdminDriverIdentityProps {
  driver: DriverIdentity;
  primaryClassName?: string;
  secondaryClassName?: string;
  layout?: "inline" | "stacked";
}

/** Admin-only: nickname primary, real name secondary. */
export function AdminDriverIdentity({
  driver,
  primaryClassName,
  secondaryClassName,
  layout = "stacked",
}: AdminDriverIdentityProps) {
  const nickname = adminDriverListLabel(driver);
  const realName = adminDriverRealName(driver);

  if (!realName || realName === nickname) {
    return <span className={primaryClassName}>{nickname}</span>;
  }

  if (layout === "inline") {
    return (
      <span className={primaryClassName}>
        {nickname}{" "}
        <span className={cn("font-normal text-[#8A9099]", secondaryClassName)}>
          ({realName})
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col">
      <span className={primaryClassName}>{nickname}</span>
      <span
        className={cn(
          "text-xs font-normal text-[#8A9099]",
          secondaryClassName
        )}
      >
        {realName}
      </span>
    </span>
  );
}
