import useAppSettings from '@/application/common/useAppSettings'
import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import Card, { CardProps } from './Card'

const cyberpunkBoarderWidth = 1.2

/**
 * only used in pools page and farm page
 */
export default function CyberpunkStyleCard({
  haveMinHeight,
  wrapperClassName,
  children,
  domRef,
  size = 'md',
  cssGradientRotate,
  cardOverflow = "overflow-hidden",
  ...restProps
}: CardProps & { haveMinHeight?: boolean; wrapperClassName?: string; cssGradientRotate?: number /* unit: deg */ }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const borderRoundSize = useMemo(() => {
    if (restProps.style?.borderRadius) return `calc(${restProps.style.borderRadius} + ${cyberpunkBoarderWidth}px)`
    if (restProps.className?.match(/mobile:rounded-2xl/g) && isMobile) return 16 + cyberpunkBoarderWidth
    if (restProps.className?.match(/(^|\s)rounded-2xl($|\s)/)) return 16 + cyberpunkBoarderWidth
    if (size === 'md') return 6 + cyberpunkBoarderWidth
    return 20 + cyberpunkBoarderWidth // default size is lg
  }, [restProps.className, size, restProps.style?.borderRadius, isMobile])
  return (
    <div
      ref={domRef as any}
      className={wrapperClassName}
      style={{
        //@ts-expect-error css variable
        ['--gradient-rotate']: cssGradientRotate != null ? `${cssGradientRotate}deg` : undefined,
        minHeight: haveMinHeight ? '300px' : undefined, // or style will be freak
        borderRadius: borderRoundSize,
        padding: cyberpunkBoarderWidth,
      }}
    >
      <Card
        {...restProps}
        size={size}
        className={twMerge('bg-light-card-bg ', cardOverflow, restProps.className)}
        style={{
          height: '100%',
          width: '100%'
        }}
      >
        {children}
      </Card>
    </div>
  )
}
