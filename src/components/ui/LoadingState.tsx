interface LoadingStateProps {
  label?: string;
  fullScreen?: boolean;
}

export default function LoadingState({
  label = "Loading",
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={
        fullScreen
          ? "flex h-screen items-center justify-center bg-white"
          : "flex flex-1 items-center justify-center p-8"
      }
    >
      <p className="label-xs animate-pulse">{label}...</p>
    </div>
  );
}
