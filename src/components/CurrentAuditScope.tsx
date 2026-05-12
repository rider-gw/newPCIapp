import type { FC } from 'react';

const CurrentAuditScope: FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Current Audit Scope</h1>
      <p>
        Define the systems, data flows, people, and third-party services that are in scope for this current PCI-DSS audit.
      </p>
      <p>
        Use this section to document and maintain the boundaries of your cardholder data environment so audit activities remain aligned.
      </p>
    </div>
  );
};

export default CurrentAuditScope;
