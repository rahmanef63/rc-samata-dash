interface ViewAllButtonProps {
  onClick?: () => void;
  label?: string;
}

export function ViewAllButton({ onClick, label = "View All" }: ViewAllButtonProps) {
  return (
    <button className="text-xs text-primary font-medium" onClick={onClick}>
      {label}
    </button>
  );
}
