interface ProgressBarProps {
  percentage: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ percentage, className = "", barClassName = "bg-primary" }: ProgressBarProps) {
  return (
    <div className={`h-1.5 bg-muted rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}
