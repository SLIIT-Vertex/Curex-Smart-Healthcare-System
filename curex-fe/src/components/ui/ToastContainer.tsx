import { useEffect, useRef } from 'react'
import { X, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'
import { useToast } from '../../store/hooks'
import type { ToastVariant } from '../../store/slices/toastSlice'

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; bg: string; border: string; iconCls: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-surface',
    border: 'border-accent-mint/50',
    iconCls: 'text-status-healthy',
  },
  error: {
    icon: XCircle,
    bg: 'bg-surface',
    border: 'border-error/40',
    iconCls: 'text-error',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-surface',
    border: 'border-accent-peach/50',
    iconCls: 'text-status-attention',
  },
  info: {
    icon: Info,
    bg: 'bg-surface',
    border: 'border-accent-sky/40',
    iconCls: 'text-status-info',
  },
}

interface ToastItemProps {
  id: string
  message: string
  variant: ToastVariant
  duration: number
  onDismiss: (id: string) => void
}

function ToastItem({ id, message, variant, duration, onDismiss }: ToastItemProps) {
  const { icon: Icon, bg, border, iconCls } = VARIANT_CONFIG[variant]
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = progressRef.current
    if (!el || duration <= 0) return
    el.style.transition = `width ${duration}ms linear`
    // Trigger reflow then start shrinking
    void el.offsetWidth
    el.style.width = '0%'
  }, [duration])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden
        rounded-xl border ${border} ${bg} px-4 py-3.5 shadow-card
        animate-[slideInRight_0.25s_ease-out]
      `}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconCls}`} strokeWidth={1.75} />
      <p className="flex-1 text-sm leading-snug text-text-primary">{message}</p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(id)}
        className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-text-secondary/10">
          <div
            ref={progressRef}
            className="h-full w-full bg-primary-light/40"
          />
        </div>
      )}
    </div>
  )
}

export function ToastContainer() {
  const { items, dismiss } = useToast()

  if (items.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5"
    >
      {items.map((item) => (
        <ToastItem key={item.id} {...item} onDismiss={dismiss} />
      ))}
    </div>
  )
}
