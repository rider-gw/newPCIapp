import type { FC } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

const sectionStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d8d8d8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
}

const linkStyle: CSSProperties = {
  display: 'inline-block',
  marginRight: '12px',
  marginTop: '8px',
  padding: '8px 12px',
  border: '1px solid #999',
  borderRadius: '6px',
  textDecoration: 'none',
  color: '#222',
}

const Controls: FC = () => {
  return (
    <section style={{ padding: '24px', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Controls</h2>
      <p style={{ marginTop: 0 }}>
        Controls has been split into dedicated pages to make navigation and day-to-day usage clearer.
      </p>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Assets</h3>
        <p style={{ marginBottom: 0 }}>
          Add assets manually, bulk load from Excel, and view stored asset records.
        </p>
        <Link to="/assets" style={linkStyle}>
          Open Assets
        </Link>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Diagnostics</h3>
        <p style={{ marginBottom: 0 }}>
          Check Cognito and DynamoDB setup status, then refresh diagnostics during troubleshooting.
        </p>
        <Link to="/diagnostics" style={linkStyle}>
          Open Diagnostics
        </Link>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Admin</h3>
        <p style={{ marginBottom: 0 }}>
          View evidentiary audit logs and list all users with their Cognito group assignments.
        </p>
        <Link to="/admin" style={linkStyle}>
          Open Admin
        </Link>
      </div>
    </section>
  )
}

export default Controls
