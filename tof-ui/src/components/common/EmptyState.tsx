import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed py-16 text-center">
      <div className="max-w-sm space-y-2 px-4">
        <Icon className="mx-auto size-10 text-muted-foreground/60" />
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
