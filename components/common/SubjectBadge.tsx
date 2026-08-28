import React from "react";

type SubjectBadgeProps = {
  type: "PRIMARY" | "SECONDARY";
};

export const SubjectBadge: React.FC<SubjectBadgeProps> = ({ type }) => {
  if (type === "PRIMARY") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-600 text-white shadow-sm">
        ★ Primary Subject
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
      ◇ Secondary Subject
    </span>
  );
};
