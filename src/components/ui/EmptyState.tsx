interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="display-title mb-4 text-center">{title}</p>
      {description && (
        <p className="body-small mb-8 text-center">{description}</p>
      )}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
