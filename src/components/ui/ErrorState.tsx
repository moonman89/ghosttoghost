interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function ErrorState({
  message,
  onRetry,
  fullScreen = false,
}: ErrorStateProps) {
  return (
    <div
      className={
        fullScreen
          ? "flex h-screen flex-col items-center justify-center gap-4 bg-white p-6"
          : "flex flex-1 flex-col items-center justify-center gap-4 p-8"
      }
    >
      <p className="error-text text-center">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary">
          [ Retry ]
        </button>
      )}
    </div>
  );
}
