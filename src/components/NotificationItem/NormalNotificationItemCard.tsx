import React, { useEffect, useRef } from 'react'
import { useHover } from '@/hooks/useHover'
import useToggle from '@/hooks/useToggle'
import Card from '../Card'
import Icon, { AppHeroIconName } from '../Icon'
import Row from '../Row'
import { spawnTimeoutControllers, TimeoutController } from './utils'
import { NormalNotificationItemInfo } from './type'

const existMs = process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 4 * 1000 // (ms)

const colors: Record<
  NormalNotificationItemInfo['type'] & string,
  { heroIconName: AppHeroIconName; ring: string; bg: string; text: string }
> = {
  success: {
    heroIconName: 'check-circle',
    ring: 'ring-[#1464ed]',
    text: 'text-[#1464ed]',
    bg: 'bg-[#1464ed]'
  },
  error: {
    heroIconName: 'exclamation-circle',
    ring: 'ring-[#f04a44]',
    text: 'text-[#1464ed]',
    bg: 'bg-[#f04a44]'
  },
  info: {
    heroIconName: 'information-circle',
    ring: 'ring-[#2e7cf8]',
    text: 'text-[#2e7cf8]',
    bg: 'bg-[#92bcff]'
  },
  warning: {
    heroIconName: 'exclamation',
    ring: 'ring-[#7e7a2f]',
    text: 'text-[#7e7a2f]',
    bg: 'bg-[#7e7a2f]'
  }
}
export function NormalNotificationItemCard({ info, close }: { info: NormalNotificationItemInfo; close: () => void }) {
  const { title, description, type = 'info', subtitle } = info

  const [isTimePassing, { off: pauseTimeline, on: resumeTimeline }] = useToggle(true)
  const timeoutController = useRef<TimeoutController>()

  useEffect(() => {
    const controller = spawnTimeoutControllers({
      onEnd: close,
      totalDuration: existMs
    })
    timeoutController.current = controller
    return controller.abort
  }, [close, existMs])

  useEffect(() => {
    timeoutController.current?.start()
  }, [])

  const itemRef = useRef<HTMLDivElement>(null)

  useHover(itemRef, {
    onHover({ is: now }) {
      if (now === 'start') {
        timeoutController.current?.pause()
        pauseTimeline()
      } else {
        timeoutController.current?.resume()
        resumeTimeline()
      }
    }
  })

  return (
    <Card
      domRef={itemRef}
      className={`min-w-[260px] relative rounded-xl ring-1.5 ring-inset ${colors[type].ring} bg-field py-4 pl-5 pr-10 mx-4 my-2 overflow-hidden pointer-events-auto`}
    >
      {/* timeline */}
      <div className="h-1 absolute top-0 left-0 right-0">
        {/* track */}
        <div className={`opacity-5 ${colors[type].bg} absolute inset-0`} />
        {/* remain-line */}
        <div
          className={`${colors[type].bg} absolute inset-0`}
          style={{
            animation: `shrink ${existMs}ms linear forwards`,
            animationPlayState: isTimePassing ? 'running' : 'paused'
          }}
        />
      </div>

      <Icon
        size="smi"
        heroIconName="x"
        className="absolute right-3 top-3 clickable text-gray-300 opacity-50 mobile:opacity-100 hover:opacity-100 transition-opacity"
        onClick={() => {
          timeoutController.current?.abort()
          close()
        }}
      />
      {/* <Icon
           heroIconName="x"
           onClick={close}
           className="rounded-full absolute top-3 right-1 h-5 w-5 text-secondary cursor-pointer"
          /> */}
      <Row className="gap-3">
        <Icon heroIconName={colors[type].heroIconName} className={colors[type].text} />
        <div>
          <div className="font-medium text-base text-color">{title}</div>
          {subtitle && <div className="font-normal text-base mobile:text-sm text-color">{subtitle}</div>}
          {description && (
            <div className="font-medium text-sm whitespace-pre-wrap mobile:text-xs text-gray-300">
              {description}
            </div>
          )}
        </div>
      </Row>
    </Card>
  )
}
