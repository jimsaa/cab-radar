"use client";

import { useState } from "react";
import { CitySelectionModal } from "@/components/profile/CitySelectionModal";
import { driverCityNeedsSelection } from "@/lib/driver-city";
import { hasCabRadarAccess, isVerifiedDriver } from "@/lib/membership";
import type { Profile } from "@/lib/types/database";

interface CitySelectionGateProps {
  userId: string;
  profile: Profile;
  children: React.ReactNode;
}

export function CitySelectionGate({
  userId,
  profile,
  children,
}: CitySelectionGateProps) {
  const [localProfile, setLocalProfile] = useState(profile);

  const mustSelectCity =
    isVerifiedDriver(localProfile) &&
    hasCabRadarAccess(localProfile) &&
    !localProfile.is_admin &&
    driverCityNeedsSelection(localProfile.driver_city);

  return (
    <>
      {mustSelectCity && (
        <CitySelectionModal
          userId={userId}
          profile={localProfile}
          onSaved={setLocalProfile}
        />
      )}
      {!mustSelectCity && children}
    </>
  );
}
