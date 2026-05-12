import Image from 'next/image'

type BrandLogoVariant = 'principal' | 'monochrome' | 'dark' | 'vertical'

interface BrandLogoProps {
  variant?: BrandLogoVariant
  width?: number
  height?: number
  className?: string
}

const LOGO_SOURCES: Record<BrandLogoVariant, string> = {
  principal: '/brand/logo-principal.svg',
  monochrome: '/brand/logo-monochrome.svg',
  dark: '/brand/logo-dark.svg',
  vertical: '/brand/logo-vertical.svg',
}

const DEFAULT_DIMENSIONS: Record<
  BrandLogoVariant,
  { width: number; height: number }
> = {
  principal: { width: 160, height: 48 },
  monochrome: { width: 160, height: 48 },
  dark: { width: 160, height: 48 },
  vertical: { width: 80, height: 96 },
}

export default function BrandLogo({
  variant = 'principal',
  width,
  height,
  className,
}: BrandLogoProps) {
  const src = LOGO_SOURCES[variant]
  const dims = DEFAULT_DIMENSIONS[variant]

  return (
    <Image
      src={src}
      alt="Appli-Picto"
      width={width ?? dims.width}
      height={height ?? dims.height}
      className={className}
      priority={false}
    />
  )
}
