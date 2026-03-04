import * as React from "react"

import { cn } from "../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "flex h-10 w-full min-w-0 rounded-md border bg-white px-3 py-2 text-sm text-[#222222] shadow-xs",
        "placeholder:text-[#9E9E9E] transition-[color,box-shadow] outline-none",
        // Borde por defecto — neutral Choucair
        "border-[#E0E0E0]",
        // Focus — verde lima Choucair
        "focus-visible:border-[#93D500] focus-visible:ring-[3px] focus-visible:ring-[#93D500]/20",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F5F5F5]",
        // Error state (aria-invalid)
        "aria-invalid:border-[#EA0029] aria-invalid:ring-[2px] aria-invalid:ring-[#EA0029]/20",
        // File inputs
        "file:text-[#222222] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
