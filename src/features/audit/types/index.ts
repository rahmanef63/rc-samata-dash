export interface AuditBranch {
  id: string;
  name: string;
  address: string;
}

export interface AuditChecklistItem {
  id: number;
  question: string;
  type: "checkbox" | "number" | "photo" | "rating" | "textarea";
  unit?: string;
  required: boolean;
}

export interface AuditSection {
  title: string;
  items: AuditChecklistItem[];
}
