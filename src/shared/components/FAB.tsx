import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FABProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  label?: string;
}

export function FAB({ onClick, icon, label = "Tambah" }: FABProps) {
  return (
    <div className="fixed bottom-24 right-4 md:hidden">
      <Button size="icon" className="w-14 h-14 rounded-full shadow-lg" onClick={onClick} aria-label={label}>
        {icon || <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
