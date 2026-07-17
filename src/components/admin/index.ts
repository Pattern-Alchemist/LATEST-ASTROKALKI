/* ─── Admin shared components barrel ───────────────────────────── */

export { default as AdminStatCard, MiniStat } from "./admin-stat-card";
export type { AdminStatCardProps, MiniStatProps } from "./admin-stat-card";

export {
  ToastProvider,
  useToast,
  toastSuccess,
  toastError,
  toastWarning,
  toastInfo,
  toastBulk,
} from "./admin-toast";
export type { Toast, ToastVariant } from "./admin-toast";

export { default as ActivityFeed, createActivity, DEMO_ACTIVITIES } from "./activity-feed";
export type { ActivityItem } from "./activity-feed";