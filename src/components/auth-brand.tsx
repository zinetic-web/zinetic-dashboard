"use client";

import * as React from "react";
import { AUTH_BRANDS, type AuthBrandKey } from "@/components/brand-marks";

const Ctx = React.createContext<AuthBrandKey>("cms");

/** Tells the sign-in forms which product they belong to, so their words can match. */
export function AuthBrandProvider({ brand, children }: { brand: AuthBrandKey; children: React.ReactNode }) {
  return <Ctx.Provider value={brand}>{children}</Ctx.Provider>;
}

export const useAuthBrand = () => AUTH_BRANDS[React.useContext(Ctx)];
