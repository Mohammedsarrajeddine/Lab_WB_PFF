interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  /** Optional tint class: panel-tint-blue, panel-tint-green, panel-tint-warm */
  tint?: string
  kicker?: string
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  tint,
  kicker,
}: PageHeaderProps) {
  return (
    <div className={`page-header ${tint ?? ''}`}>
      <div className="page-header__top">
        <div>
          {kicker ? <p className="page-header__kicker">{kicker}</p> : null}
          <h1 className="page-header__title">{title}</h1>
          {subtitle ? (
            <p className="page-header__subtitle">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="page-header__actions">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
