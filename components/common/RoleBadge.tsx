import React from "react";

type RoleBadgeProps = {
  role: "ADMIN" | "HOD" | "TEACHER" | "STUDENT";
  size?: "xs" | "sm" | "md" | "lg";
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = "md" }) => {
  const config = {
    ADMIN: {
      label: "System Admin",
      bgColor: "bg-purple-100 dark:bg-purple-950/60",
      textColor: "text-purple-700 dark:text-purple-300",
      borderColor: "border-purple-300 dark:border-purple-700",
      icon: "⚙️",
    },
    HOD: {
      label: "Head of Department (HOD)",
      bgColor: "bg-amber-100 dark:bg-amber-950/60",
      textColor: "text-amber-700 dark:text-amber-300",
      borderColor: "border-amber-300 dark:border-amber-700",
      icon: "🏛️",
    },
    TEACHER: {
      label: "Faculty / Teacher",
      bgColor: "bg-blue-100 dark:bg-blue-950/60",
      textColor: "text-blue-700 dark:text-blue-300",
      borderColor: "border-blue-300 dark:border-blue-700",
      icon: "👨‍🏫",
    },
    STUDENT: {
      label: "Student",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/60",
      textColor: "text-emerald-700 dark:text-emerald-300",
      borderColor: "border-emerald-300 dark:border-emerald-700",
      icon: "🎓",
    },
  };

  const current = config[role] ?? config.STUDENT;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5 font-medium",
    lg: "px-4 py-1.5 text-base gap-2 font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${current.bgColor} ${current.textColor} ${current.borderColor} ${sizeClasses[size]} transition-all shadow-sm`}
    >
      <span>{current.icon}</span>
      <span>{current.label}</span>
    </span>
  );
};
