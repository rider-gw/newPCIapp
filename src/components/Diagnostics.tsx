import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { getAssetsDiagnostics } from '../services/assetsStore'
import type { AssetsDiagnostics } from '../services/assetsStore'

const sectionStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d8d8d8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
}

const Diagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<AssetsDiagnostics | null>(null)

  const loadDiagnostics = async () => {
    const data = await getAssetsDiagnostics()
    setDiagnostics(data)
  }

  useEffect(() => {
    void loadDiagnostics()
  }, [])

  return (
    <section style={{ padding: '24px', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Diagnostics</h2>
      <p style={{ marginTop: 0 }}>
        Validate Cognito and DynamoDB setup for asset management.
      </p>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>DynamoDB Diagnostics</h3>
        {!diagnostics ? (
          <p>Loading diagnostics...</p>
        ) : (
          <>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Region: {diagnostics.region}</li>
              <li>Table: {diagnostics.tableName}</li>
              <li>Identity Pool configured: {diagnostics.identityPoolIdConfigured ? 'Yes' : 'No'}</li>
              <li>User Pool configured: {diagnostics.userPoolIdConfigured ? 'Yes' : 'No'}</li>
              <li>User signed in: {diagnostics.isSignedIn ? 'Yes' : 'No'}</li>
              <li>AWS credentials available: {diagnostics.hasAwsCredentials ? 'Yes' : 'No'}</li>
            </ul>
            {diagnostics.error ? (
              <p style={{ color: '#b00020', margin: 0 }}>{diagnostics.error}</p>
            ) : (
              <p style={{ color: '#0a7d26', margin: 0 }}>No configuration issues detected.</p>
            )}
          </>
        )}

        <button
          type="button"
          onClick={() => {
            void loadDiagnostics()
          }}
          style={{ marginTop: '12px', padding: '8px 12px', cursor: 'pointer' }}
        >
          Refresh Diagnostics
        </button>
      </div>
    </section>
  )
}

export default Diagnostics
