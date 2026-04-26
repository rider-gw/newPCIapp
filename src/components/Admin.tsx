import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  currentUserHasAdminAccess,
  listAuditLogs,
  listUsersAndGroups,
} from '../services/adminStore'
import type { AdminUserRecord, AuditLogRecord } from '../services/adminStore'

const sectionStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d8d8d8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
}

const thStyle: CSSProperties = {
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
  padding: '8px',
}

const tdStyle: CSSProperties = {
  borderBottom: '1px solid #f0f0f0',
  padding: '8px',
  verticalAlign: 'top',
}

const Admin = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([])
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [error, setError] = useState<string>('')

  const loadAdminData = async () => {
    setError('')
    setIsLoading(true)

    try {
      const hasAdminAccess = await currentUserHasAdminAccess()
      setIsAdmin(hasAdminAccess)

      if (!hasAdminAccess) {
        setError('Access denied. Only users with ADMIN access can use this page.')
        return
      }

      const [logs, allUsers] = await Promise.all([listAuditLogs(), listUsersAndGroups()])
      setAuditLogs(logs)
      setUsers(allUsers)
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAdminData()
  }, [])

  return (
    <section style={{ padding: '24px', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Admin</h2>
      <p style={{ marginTop: 0 }}>
        Review evidentiary audit logs and user group assignments. Access is restricted to ADMIN users.
      </p>

      <div style={sectionStyle}>
        <button
          type="button"
          onClick={() => {
            void loadAdminData()
          }}
          style={{ padding: '8px 12px', cursor: 'pointer' }}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh Admin Data'}
        </button>
        {error && <p style={{ color: '#b00020', marginBottom: 0 }}>{error}</p>}
      </div>

      {isAdmin && (
        <>
          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Audit Logs</h3>
            {auditLogs.length === 0 ? (
              <p>No audit records found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date Time</th>
                    <th style={thStyle}>Timezone</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle}>{log.dateTime || 'N/A'}</td>
                      <td style={tdStyle}>{log.timezone || 'N/A'}</td>
                      <td style={tdStyle}>{log.user}</td>
                      <td style={tdStyle}>{log.type}</td>
                      <td style={tdStyle}>{log.details || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Users and Groups</h3>
            {users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Username</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.username}>
                      <td style={tdStyle}>{user.username}</td>
                      <td style={tdStyle}>{user.email || 'N/A'}</td>
                      <td style={tdStyle}>{user.groups.length ? user.groups.join(', ') : 'No groups'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default Admin
