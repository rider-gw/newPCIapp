import type { FC } from 'react';

const CurrentAuditScopeAdd: FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Current Audit Scope - Add</h1>
      <p>Use this page to add new scope entries for the current audit.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr',
          gap: '12px',
          marginTop: '16px',
          alignItems: 'end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#0f172a', fontWeight: 600 }}>
          Req#
          <input type="text" style={{ height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#0f172a', fontWeight: 600 }}>
          Summary of Requirement
          <input type="text" style={{ height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#0f172a', fontWeight: 600 }}>
          Audit Period
          <input type="text" style={{ height: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px' }} />
        </label>
      </div>
    </div>
  );
};

export default CurrentAuditScopeAdd;
