export interface UserProfile {
  name: string;
  role: string;
  id: string;
  avatar?: string;
}

export interface Permission {
  label: string;
  description: string;
  enabled: boolean;
  iconName: string;
}

export interface AppSettingItem {
  label: string;
  value?: string;
  iconName: string;
}
