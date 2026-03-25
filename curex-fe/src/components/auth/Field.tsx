/** Label + input slot + optional validation error — a layout UI primitive. */
export const Field = ({
  label,
  children,
  error,
}: {
  label: React.ReactNode
  children: React.ReactNode
  error?: string
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-primary">{label}</label>
    {children}
    {error && <p className="text-xs text-error">{error}</p>}
  </div>
)
