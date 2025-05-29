export interface LinkGroup {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  urls: string[];
}

export interface AppData {
  pageTitle: string;
  linkGroups: LinkGroup[];
  theme: 'light' | 'dark';
  customPrimaryColor?: string; // HEX color string, e.g., #RRGGBB
}
