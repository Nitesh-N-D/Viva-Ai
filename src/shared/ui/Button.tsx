import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

const variantClasses: Record<string, string> = {
  primary: "bg-leaf-600 text-white active:bg-leaf-800",
  secondary: "bg-soil-100 text-soil-900 active:bg-soil-400",
  ghost: "bg-transparent text-leaf-600 underline",
};

// Minimum 48px tap target per UI/UX guideline — semi-literate users on
// basic touchscreens need generous hit areas.
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`min-h-[48px] min-w-[48px] px-5 py-3 rounded-tile text-lg font-display font-semibold transition-colors ${variantClasses[variant]} ${className}`}
    />
  );
}
