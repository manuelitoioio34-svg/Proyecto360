import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[#93D500]/40 cursor-pointer",
  {
    variants: {
      variant: {
        // Primario — verde lima Choucair, texto oscuro
        default:
          "bg-[#93D500] text-[#222222] font-semibold shadow-xs hover:bg-[#7cb800] hover:shadow-md hover:-translate-y-0.5",
        // Destructivo — rojo Choucair
        destructive:
          "bg-[#EA0029] text-white shadow-xs hover:bg-[#c8001f] hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-[#EA0029]/30",
        // Outline — borde charcoal, fondo transparente
        outline:
          "border border-[#222222] bg-transparent text-[#222222] shadow-xs hover:bg-[#222222]/5 hover:shadow-md hover:-translate-y-0.5",
        // Secundario — charcoal sólido, texto blanco
        secondary:
          "bg-[#222222] text-white shadow-xs hover:bg-[#383838] hover:shadow-md hover:-translate-y-0.5",
        // Ghost — sin fondo, hover sutil
        ghost:
          "text-[#222222] hover:bg-[#222222]/8 hover:shadow-sm",
        // Link — texto verde lima
        link: "text-[#93D500] underline-offset-4 hover:underline hover:text-[#7cb800]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
