import type { UserProfile, Permission, AppSettingItem } from "../types";

export const currentUser: UserProfile = {
  name: "John Doe",
  role: "Project Manager",
  id: "8842",
};

export const permissions: Permission[] = [
  { label: "Supervisor Access", description: "Enable advanced override tools", enabled: true, iconName: "Settings" },
  { label: "Real-time Alerts", description: "Push notifications for inventory", enabled: false, iconName: "Bell" },
];

export const appSettings: AppSettingItem[] = [
  { label: "Language", value: "English", iconName: "Globe" },
  { label: "Appearance", value: "Light", iconName: "Moon" },
  { label: "Privacy & Security", iconName: "Shield" },
];
