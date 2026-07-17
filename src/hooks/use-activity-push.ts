"use client";

import { useCallback } from "react";
import { createActivity, type ActivityItem } from "@/components/admin/activity-feed";

/**
 * Hook to push activities into the feed from any component.
 *
 * Usage in a page component:
 *   const { pushActivity } = useActivityPush();
 *   pushActivity("booking_created", "New booking from ...");
 *
 * NOTE: In a real implementation, this would communicate with the
 * ActivityFeed via a shared context or event bus. For now, we
 * expose the factory function so pages can call the API endpoint
 * and the feed will pick it up on the next poll cycle.
 *
 * If you need instant (non-polling) updates, wrap your layout with
 * an <ActivityProvider> that uses a shared ref / context.
 */

export function useActivityPush() {
  const pushActivity = useCallback(
    async (type: ActivityItem["type"], message: string) => {
      // Optimistic local push — the feed component will deduplicate on next poll
      try {
        await fetch("/api/admin/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createActivity(type, message)),
        });
      } catch {
        // Non-critical — silent fail
      }
    },
    []
  );

  return { pushActivity };
}