"use client"

type BrandLogoProps = {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="https://www.pearldatadirect.com/assets/images/logo.png"
      alt="Pearl Data Direct"
      className={className ?? "h-10 w-auto"}
      referrerPolicy="no-referrer"
    />
  )
}
