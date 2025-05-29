"use client";

import { icons, type LucideProps, HelpCircle } from 'lucide-react';

interface LucideIconByNameProps extends LucideProps {
  name: string;
}

const LucideIcon = ({ name, ...props }: LucideIconByNameProps) => {
  // Ensure name is in PascalCase as expected by lucide-react icons object
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  
  const IconComponent = icons[formattedName as keyof typeof icons];

  if (!IconComponent) {
    return <HelpCircle {...props} />; // Default fallback icon
  }

  return <IconComponent {...props} />;
};

export default LucideIcon;
