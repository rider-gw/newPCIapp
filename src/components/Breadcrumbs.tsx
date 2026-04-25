import type { FC } from 'react'
import { Link, useLocation } from 'react-router-dom'

const titleCase = (value: string): string =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const Breadcrumbs: FC = () => {
  const location = useLocation()
  const rawSegments = location.pathname.split('/').filter(Boolean)
  const segments = rawSegments.length === 0 ? ['home'] : rawSegments

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '12px', fontSize: '14px', color: '#555' }}>
      {segments.map((segment, index) => {
        const to = `/${segments.slice(0, index + 1).join('/')}`
        const label = titleCase(segment)
        const isLast = index === segments.length - 1

        return (
          <span key={to}>
            {index > 0 && <span style={{ margin: '0 6px' }}>/</span>}
            {isLast ? (
              <strong style={{ color: '#222' }}>{label}</strong>
            ) : (
              <Link to={to} style={{ color: '#444', textDecoration: 'none' }}>
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
