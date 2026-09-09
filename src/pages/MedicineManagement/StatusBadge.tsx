import type { Medicine } from "@/types/medicine";
import { Badge } from "@/components/ui/Primitives";

export function StatusBadge({ m }: { m: Medicine }) {
  if (m.status === "expired") return <Badge tone="gray">Expired</Badge>;
  if (m.status === "completed") return <Badge tone="purple">Completed</Badge>;
  if (m.remaining === 0) return <Badge tone="red">Out of stock</Badge>;
  if (m.remaining <= m.quantity * 0.2) return <Badge tone="amber">Low stock</Badge>;
  return <Badge tone="green">Active</Badge>;
}
