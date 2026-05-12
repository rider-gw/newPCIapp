import type { FC } from 'react'
import { Link, useLocation } from 'react-router-dom'

const titleCase = (value: string): string =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

type BreadcrumbItem = {
  label: string
  to: string
}

const buildFallbackCrumbs = (pathname: string): BreadcrumbItem[] => {
  const rawSegments = pathname.split('/').filter(Boolean)

  if (rawSegments.length === 0 || pathname === '/home') {
    return [{ label: 'Home', to: '/home' }]
  }

  const segmentCrumbs = rawSegments.map((segment, index) => ({
    label: titleCase(segment),
    to: `/${rawSegments.slice(0, index + 1).join('/')}`,
  }))

  return [{ label: 'Home', to: '/home' }, ...segmentCrumbs]
}

const routeBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  '/': [{ label: 'Home', to: '/home' }],
  '/home': [{ label: 'Home', to: '/home' }],
  '/admin': [
    { label: 'Home', to: '/home' },
    { label: 'Admin', to: '/admin' },
  ],
  '/settings': [
    { label: 'Home', to: '/home' },
    { label: 'Admin', to: '/admin' },
    { label: 'Settings', to: '/settings' },
  ],
  '/diagnostics': [
    { label: 'Home', to: '/home' },
    { label: 'Admin', to: '/admin' },
    { label: 'Diagnostics', to: '/diagnostics' },
  ],
  '/pci-requirements': [
    { label: 'Home', to: '/home' },
    { label: 'PCI Requirements', to: '/pci-requirements' },
  ],
  '/controls': [
    { label: 'Home', to: '/home' },
    { label: 'Controls', to: '/controls' },
  ],
  '/assets': [
    { label: 'Home', to: '/home' },
    { label: 'Assets', to: '/assets' },
  ],
  '/audits': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
  ],
  '/current-audit': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Current Audit', to: '/current-audit' },
  ],
  '/current-audit/scope': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Current Audit', to: '/current-audit' },
    { label: 'Scope', to: '/current-audit/scope' },
  ],
  '/current-audit/scope/add': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Current Audit', to: '/current-audit' },
    { label: 'Scope', to: '/current-audit/scope' },
    { label: 'Add', to: '/current-audit/scope/add' },
  ],
  '/current-audit/scope/display': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Current Audit', to: '/current-audit' },
    { label: 'Scope', to: '/current-audit/scope' },
    { label: 'Display', to: '/current-audit/scope/display' },
  ],
  '/current-audit/scope/search-report': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Current Audit', to: '/current-audit' },
    { label: 'Scope', to: '/current-audit/scope' },
    { label: 'Search & Report', to: '/current-audit/scope/search-report' },
  ],
  '/past-audits': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Past Audits', to: '/past-audits' },
  ],
  '/continuous-monitoring': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Continuous Monitoring', to: '/continuous-monitoring' },
  ],
  '/continuous-monitoring/home': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Continuous Monitoring', to: '/continuous-monitoring' },
    { label: 'Home', to: '/continuous-monitoring/home' },
  ],
  '/continuous-monitoring/set-rules': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Continuous Monitoring', to: '/continuous-monitoring' },
    { label: 'Set Rules', to: '/continuous-monitoring/set-rules' },
  ],
  '/continuous-monitoring/reports': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Continuous Monitoring', to: '/continuous-monitoring' },
    { label: 'Reports', to: '/continuous-monitoring/reports' },
  ],
  '/continuous-monitoring/new-modify-rule': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Continuous Monitoring', to: '/continuous-monitoring' },
    { label: 'New/Modify Rule', to: '/continuous-monitoring/new-modify-rule' },
  ],
  '/continuous-monitoring/test-rule': [
    { label: 'Home', to: '/home' },
    { label: 'Audits', to: '/audits' },
    { label: 'Continuous Monitoring', to: '/continuous-monitoring' },
    { label: 'Test Rule', to: '/continuous-monitoring/test-rule' },
  ],
}

const Breadcrumbs: FC = () => {
  const location = useLocation()
  const pathname = location.pathname.replace(/\/+$/, '') || '/'
  const crumbs = routeBreadcrumbs[pathname] ?? buildFallbackCrumbs(pathname)

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '12px', fontSize: '14px', color: '#555' }}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1

        return (
          <span key={`${crumb.to}-${crumb.label}-${index}`}>
            {index > 0 && <span style={{ margin: '0 6px' }}>/</span>}
            <Link
              to={crumb.to}
              style={{
                color: isLast ? '#222' : '#444',
                textDecoration: 'none',
                fontWeight: isLast ? 700 : 400,
              }}
              aria-current={isLast ? 'page' : undefined}
            >
              {crumb.label}
            </Link>
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs
