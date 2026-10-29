"use client";

import React from "react";
import { BUYBACK_STATUS_COLORS, getBuybackStatusIcon, getBuybackStatusLabel } from "@/lib/buyback";

export function BuybackStatusBadge({ status, mode, className = "" }: { status: string; mode: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${
        BUYBACK_STATUS_COLORS[status] || BUYBACK_STATUS_COLORS.PENDING
      } ${className}`}
    >
      <span className="text-sm leading-none">{getBuybackStatusIcon(status, mode)}</span>
      <span>{getBuybackStatusLabel(status, mode)}</span>
    </span>
  );
}

export default BuybackStatusBadge;
