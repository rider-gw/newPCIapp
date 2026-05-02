import type { FC } from 'react';

const CurrentAudit: FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Current Audit</h1>
      <p>
        A PCI-DSS audit is a structured evaluation, generally conducted annually by a
        Qualified Security Assessor (QSA) for high-volume merchants (Level 1) or via
        Self-Assessment Questionnaire (SAQ) for others.
      </p>
      <p>
        It involves assessing an organization&apos;s systems against the 12 requirements
        of the PCI DSS standard, culminating in a Report on Compliance (ROC) or an
        Attestation of Compliance (AOC).
      </p>
      <p>
        Each approach has different mandatory requirements. The best approach is to
        incorporate as much continuous compliance as possible as part of your daily
        regime. The easiest way, where possible, is to automate this.
      </p>
    </div>
  );
};

export default CurrentAudit;
