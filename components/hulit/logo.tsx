import Image from "next/image"

/**
 * Official SANDIT brand logo (exact uploaded artwork, background removed).
 * Use variant="white" on dark backgrounds and variant="green" on light ones.
 */
export function SanditLogo({
  className = "",
  variant = "green",
}: {
  className?: string
  variant?: "green" | "white"
}) {
  const src = variant === "white" ? "/sandit-logo-white.png" : "/sandit-logo.png"
  return (
    <Image
      src={src || "/placeholder.svg"}
      alt="SANDIT — סנדיט"
      width={912}
      height={332}
      priority
      className={className}
    />
  )
}
