import type { LucideIcon } from 'lucide-react';
import { Clock, Truck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive';

export const ORDER_STATUS_VARIANT: Record<string, BadgeVariant> = {
  Paid: 'default',
  Shipped: 'warning',
  Completed: 'success',
  Disputed: 'destructive',
  Refunded: 'secondary',
  Cancelled: 'secondary',
};

export const ORDER_STATUS_ICON: Record<string, LucideIcon> = {
  Paid: Clock,
  Shipped: Truck,
  Completed: CheckCircle2,
  Disputed: AlertTriangle,
  Refunded: XCircle,
  Cancelled: XCircle,
};
