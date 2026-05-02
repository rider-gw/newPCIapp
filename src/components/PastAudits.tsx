import type { FC } from 'react';

const PastAudits: FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Past Audits</h1>
      <p>
        This page allows you to log and track lessons learned from previous PCI-DSS
        audits.
      </p>
      <p>
        Capturing lessons learned helps your organization move forward and make
        targeted changes where required, so you can continually improve your security
        posture.
      </p>
    </div>
  );
};

export default PastAudits;
