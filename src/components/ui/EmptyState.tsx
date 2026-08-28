import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] mb-4">
        <Inbox className="h-6 w-6 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 text-[13px] text-[var(--muted-foreground)] max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
