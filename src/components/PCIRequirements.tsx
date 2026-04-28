import { useEffect, useState } from 'react'
import type { CSSProperties, FC } from 'react'
import { fetchUserAttributes, getCurrentUser } from '@aws-amplify/auth'
import { safeWriteAuditLog } from '../services/auditLogStore'
import { listAssets } from '../services/assetsStore'
import type { StoredAsset } from '../services/assetsStore'
import { getRequirementNotes, saveRequirementNotes } from '../services/pciRequirementsStore'
import {
  EVIDENCE_LINK_TYPES,
  REQUIREMENT_TEST_STATUSES,
  addRequirementEvidenceLink,
  createRequirementTest,
  listRequirementEvidenceLinks,
  listRequirementTestsByRequirement,
} from '../services/requirementTestingStore'
import type {
  EvidenceLinkType,
  RequirementTestStatus,
  StoredRequirementEvidenceLink,
  StoredRequirementTest,
} from '../services/requirementTestingStore'

interface RequirementSection {
  id: string
  title: string
  objective: string
  sections: Array<{
    id: string
    label: string
    summary: string
  }>
}

interface RequirementDetail {
  id: string
  title: string
  familyTitle: string
  familyObjective: string
  definedApproach: string
  customizedApproach: string
  definedApproachTestingProcedure: string
  guidance: string
}

const requirements: RequirementSection[] = [
  {
    id: '1',
    title: 'Install and Maintain Network Security Controls',
    objective: 'Define, deploy, and review network controls so only approved traffic reaches the cardholder data environment.',
    sections: [
      { id: '1.1', label: 'Governance and operating procedures', summary: 'Document and maintain how network security controls are designed, assigned, reviewed, and kept effective.' },
      { id: '1.2', label: 'Configuration standards for network security controls', summary: 'Keep rule sets current, justified, approved, and aligned to the business purpose of each connection.' },
      { id: '1.3', label: 'Restrict inbound and outbound traffic', summary: 'Allow only necessary services, ports, protocols, and destinations, with explicit deny rules for all other traffic.' },
      { id: '1.4', label: 'Segmentation and trusted boundary protections', summary: 'Protect traffic that crosses trusted and untrusted networks, including internet-facing paths and internal segmentation points.' },
      { id: '1.5', label: 'Controls for computing devices that can connect remotely', summary: 'Manage the risk from laptops, workstations, and other devices that can access the environment from outside controlled networks.' },
    ],
  },
  {
    id: '2',
    title: 'Apply Secure Configurations to All System Components',
    objective: 'Harden systems consistently so defaults, weak settings, and unnecessary functionality do not create exploitable conditions.',
    sections: [
      { id: '2.1', label: 'Configuration management processes', summary: 'Define, approve, and maintain secure configuration standards for every in-scope technology platform.' },
      { id: '2.2', label: 'Vendor defaults and insecure baseline settings', summary: 'Change default credentials and remove or disable insecure services, accounts, and features before systems go live.' },
      { id: '2.3', label: 'Primary function per server and system hardening', summary: 'Limit systems to necessary roles and configure them to reduce the available attack surface.' },
      { id: '2.4', label: 'Inventory of system components', summary: 'Maintain an accurate inventory of in-scope hardware, software, virtual assets, and their roles.' },
      { id: '2.5', label: 'Protection from unauthorized configuration changes', summary: 'Control and monitor changes to configuration files, scripts, and security settings.' },
      { id: '2.6', label: 'Custom and shared cryptographic protocols', summary: 'Review any non-standard cryptographic implementation to confirm it is necessary and securely designed.' },
    ],
  },
  {
    id: '3',
    title: 'Protect Stored Account Data',
    objective: 'Minimize retained account data and protect any permitted stored values through strong technical and operational safeguards.',
    sections: [
      { id: '3.1', label: 'Data retention and minimization', summary: 'Keep stored account data only when justified, define retention periods, and remove data when no longer needed.' },
      { id: '3.2', label: 'Sensitive authentication data storage prohibition', summary: 'Do not store prohibited authentication data after authorization, even if encrypted.' },
      { id: '3.3', label: 'Masking and display controls', summary: 'Show account numbers only to users with a defined business need and mask them everywhere else.' },
      { id: '3.4', label: 'Unreadable stored account data', summary: 'Render stored account data unreadable with strong cryptography, truncation, tokens, or equivalent protections.' },
      { id: '3.5', label: 'Cryptographic key protection', summary: 'Protect keys against disclosure and misuse throughout generation, storage, distribution, rotation, and retirement.' },
      { id: '3.6', label: 'Key management processes and procedures', summary: 'Operate formal key lifecycle controls, dual control where needed, and documented recovery and replacement procedures.' },
      { id: '3.7', label: 'Security of removable and media-based storage', summary: 'Control physical and logical access to media containing account data and track movement or destruction.' },
    ],
  },
  {
    id: '4',
    title: 'Protect Cardholder Data with Strong Cryptography During Transmission Over Open, Public Networks',
    objective: 'Ensure account data remains confidential and intact whenever it crosses networks that the organization does not fully control.',
    sections: [
      { id: '4.1', label: 'Trusted encrypted transmission', summary: 'Use strong cryptography, secure protocols, and certificate management for transmissions over open or public networks.' },
      { id: '4.2', label: 'End-user messaging technologies', summary: 'Never send unprotected account data through email, chat, SMS, or similar user messaging channels.' },
    ],
  },
  {
    id: '5',
    title: 'Protect All Systems and Networks from Malicious Software',
    objective: 'Prevent, detect, and respond to malware across systems commonly targeted by malicious code.',
    sections: [
      { id: '5.1', label: 'Malware defense program governance', summary: 'Define how anti-malware technologies and supporting processes are selected, deployed, and maintained.' },
      { id: '5.2', label: 'Anti-malware deployment and operation', summary: 'Deploy anti-malware where risk exists, keep it active, and protect its mechanisms from unauthorized disablement.' },
      { id: '5.3', label: 'Evaluation for systems not traditionally affected', summary: 'Periodically assess systems with lower malware exposure and document why continuous anti-malware is or is not required.' },
      { id: '5.4', label: 'Updates, scans, and alerting', summary: 'Keep signatures and engines current, run scans as appropriate, and investigate suspected malware activity.' },
    ],
  },
  {
    id: '6',
    title: 'Develop and Maintain Secure Systems and Software',
    objective: 'Build and operate software and infrastructure so vulnerabilities are identified early, corrected quickly, and prevented from recurring.',
    sections: [
      { id: '6.1', label: 'Secure development governance', summary: 'Establish roles, methods, and accountability for secure development and system change activities.' },
      { id: '6.2', label: 'Custom software lifecycle controls', summary: 'Integrate security into requirements, design, coding, testing, and release practices for bespoke software.' },
      { id: '6.3', label: 'Security training for developers', summary: 'Train personnel involved in software development on secure coding practices relevant to their languages and frameworks.' },
      { id: '6.4', label: 'Public-facing application protection', summary: 'Protect internet-exposed applications with code review, automated testing, and technical controls such as web application protection.' },
      { id: '6.5', label: 'Change control for system and software updates', summary: 'Authorize, test, approve, and document changes before deployment into production.' },
      { id: '6.6', label: 'Patch and vulnerability remediation', summary: 'Identify security vulnerabilities, rank them by risk, and apply fixes within defined timeframes.' },
    ],
  },
  {
    id: '7',
    title: 'Restrict Access to System Components and Cardholder Data by Business Need to Know',
    objective: 'Limit access so people and processes can reach only the systems and data required for their assigned responsibilities.',
    sections: [
      { id: '7.1', label: 'Access control governance', summary: 'Define access control rules, ownership, approvals, and review expectations for all in-scope systems and data.' },
      { id: '7.2', label: 'Role-based access assignment', summary: 'Grant access based on job role and least privilege, with explicit approval for privileged permissions.' },
      { id: '7.3', label: 'Periodic access review and revocation', summary: 'Review user and service access regularly, remove unnecessary privileges, and revoke access promptly when no longer required.' },
    ],
  },
  {
    id: '8',
    title: 'Identify Users and Authenticate Access to System Components',
    objective: 'Ensure every access action is attributable to a known identity and protected by strong authentication controls.',
    sections: [
      { id: '8.1', label: 'Identity and account lifecycle management', summary: 'Provision, manage, review, and retire user, administrator, vendor, and service accounts through controlled processes.' },
      { id: '8.2', label: 'Authentication strength and credential handling', summary: 'Enforce strong credential rules, secure storage, and controls for password resets, lockouts, and idle sessions.' },
      { id: '8.3', label: 'Multi-factor authentication', summary: 'Require MFA where specified, especially for administrative access, remote access, and access into the cardholder data environment.' },
      { id: '8.4', label: 'Use of application and system accounts', summary: 'Restrict shared, generic, and system-level identities, and manage secrets for automated accounts securely.' },
      { id: '8.5', label: 'Alternative authentication mechanisms', summary: 'Secure certificates, tokens, smart cards, and biometrics with controls equivalent to their risk and usage.' },
      { id: '8.6', label: 'Session and authentication architecture', summary: 'Protect session integrity and align authentication controls to the sensitivity of the system or data being accessed.' },
    ],
  },
  {
    id: '9',
    title: 'Restrict Physical Access to Cardholder Data',
    objective: 'Protect facilities, devices, media, and work areas so physical access cannot be used to bypass logical controls.',
    sections: [
      { id: '9.1', label: 'Facility entry controls', summary: 'Control and monitor physical entry to sensitive locations with badges, logs, escorts, and review procedures.' },
      { id: '9.2', label: 'Protection for equipment and media', summary: 'Secure devices and storage media from tampering, theft, substitution, and unauthorized removal.' },
      { id: '9.3', label: 'Workstation and point-of-interaction controls', summary: 'Protect user work areas and payment interaction devices from misuse or physical compromise.' },
      { id: '9.4', label: 'Media movement, retention, and destruction', summary: 'Track media throughout its lifecycle and destroy it securely when retention requirements end.' },
      { id: '9.5', label: 'Inspection for tampering and substitution', summary: 'Regularly inspect payment capture devices and train personnel to identify suspicious changes.' },
    ],
  },
  {
    id: '10',
    title: 'Log and Monitor All Access to System Components and Cardholder Data',
    objective: 'Generate reliable audit trails and review them so suspicious activity can be detected, investigated, and retained as evidence.',
    sections: [
      { id: '10.1', label: 'Audit logging governance', summary: 'Define logging responsibilities, critical events, and retention expectations for all in-scope systems.' },
      { id: '10.2', label: 'Events that must be logged', summary: 'Capture user actions, administrative activity, authentication outcomes, access to sensitive data, and critical system events.' },
      { id: '10.3', label: 'Required log record details', summary: 'Ensure each audit record contains enough detail to identify who did what, when, where, and with what result.' },
      { id: '10.4', label: 'Time synchronization', summary: 'Synchronize clocks across systems so event timelines remain accurate and defensible.' },
      { id: '10.5', label: 'Log protection', summary: 'Safeguard logs from unauthorized viewing, modification, or deletion and ensure centralized collection where appropriate.' },
      { id: '10.6', label: 'Log reviews and response', summary: 'Review logs and alerts at defined frequencies, investigate anomalies, and document follow-up actions.' },
      { id: '10.7', label: 'Retention and availability of history', summary: 'Retain audit history long enough to support forensic analysis and make recent logs readily available.' },
    ],
  },
  {
    id: '11',
    title: 'Test Security of Systems and Networks Regularly',
    objective: 'Validate that security controls remain effective over time and that exploitable weaknesses are found before attackers can use them.',
    sections: [
      { id: '11.1', label: 'Detection of unauthorized wireless and network access points', summary: 'Identify rogue wireless or unauthorized connection paths on a recurring basis.' },
      { id: '11.2', label: 'Vulnerability scanning', summary: 'Run internal and external vulnerability scans, address findings, and repeat testing until required results are achieved.' },
      { id: '11.3', label: 'Penetration testing and segmentation validation', summary: 'Perform penetration tests and verify segmentation controls continue to isolate the cardholder data environment as intended.' },
      { id: '11.4', label: 'Intrusion detection, prevention, and anomaly coverage', summary: 'Use technical monitoring to detect and respond to suspected malicious activity in critical network locations.' },
      { id: '11.5', label: 'File and change integrity monitoring', summary: 'Detect unauthorized changes to critical files, configurations, and content, then investigate unexpected modifications.' },
      { id: '11.6', label: 'Public-facing payment page change detection', summary: 'Monitor scripts and page content used in browser-based payment flows to identify unauthorized modification.' },
    ],
  },
  {
    id: '12',
    title: 'Support Information Security with Organizational Policies and Programs',
    objective: 'Back technical controls with governance, accountability, awareness, risk management, and third-party oversight.',
    sections: [
      { id: '12.1', label: 'Security governance framework', summary: 'Define, approve, communicate, and periodically review security policies, standards, and responsibilities.' },
      { id: '12.2', label: 'Risk assessment and targeted analysis', summary: 'Assess security risk regularly and use targeted analyses where the standard allows frequency or method flexibility.' },
      { id: '12.3', label: 'Acceptable use and personnel responsibilities', summary: 'Set expectations for technology use, remote access, media handling, and user accountability.' },
      { id: '12.4', label: 'Executive responsibility and reporting', summary: 'Assign overall PCI accountability, monitor program status, and ensure management receives meaningful security reporting.' },
      { id: '12.5', label: 'Scope definition and maintenance', summary: 'Identify the cardholder data environment, connected systems, data flows, and technologies that affect security scope.' },
      { id: '12.6', label: 'Security awareness program', summary: 'Train personnel continuously so they can recognize threats, follow policy, and report suspicious activity.' },
      { id: '12.7', label: 'Background checks and personnel trust controls', summary: 'Screen personnel where permitted and appropriate for roles with access to sensitive environments or data.' },
      { id: '12.8', label: 'Third-party service provider management', summary: 'Maintain due diligence, contracts, responsibility matrices, and monitoring for service providers that impact compliance.' },
      { id: '12.9', label: 'Service provider responsibility acknowledgements', summary: 'Obtain clear confirmation of which PCI DSS responsibilities are managed by each service provider.' },
      { id: '12.10', label: 'Incident response readiness', summary: 'Maintain, test, and improve an incident response plan that covers payment data compromise and supporting coordination paths.' },
      { id: '12.11', label: 'Continuous security monitoring and improvement', summary: 'Use testing results, lessons learned, and environment changes to refine the security program over time.' },
    ],
  },
]

const pageStyle: CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  textAlign: 'left',
}

const introCardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #f7fbff 0%, #eef4ff 100%)',
  border: '1px solid #d8e6ff',
  borderRadius: '14px',
  padding: '24px',
  boxShadow: '0 10px 24px rgba(40, 76, 140, 0.08)',
}

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  marginTop: '18px',
}

const summaryCardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #d9e3f5',
  borderRadius: '12px',
  padding: '14px 16px',
}

const contentLayoutStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
}

const panelStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #d9dfe8',
  borderRadius: '14px',
  padding: '18px 20px',
  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)',
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '16px',
}

const detailSectionStyle: CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '14px',
}

const textareaStyle: CSSProperties = {
  width: '100%',
  minHeight: '100px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  padding: '10px 12px',
  fontSize: '0.95rem',
  color: '#0f172a',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.6,
  boxSizing: 'border-box',
}

const saveButtonStyle: CSSProperties = {
  marginTop: '14px',
  padding: '10px 22px',
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.97rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  width: '100%',
  height: '38px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  padding: '0 10px',
  fontSize: '0.92rem',
  boxSizing: 'border-box',
}

const selectStyle: CSSProperties = {
  ...inputStyle,
  backgroundColor: '#ffffff',
}

const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '10px',
}

const getAuditUser = async (): Promise<string> => {
  try {
    const user = await getCurrentUser()
    const attributes = await fetchUserAttributes()
    return attributes.email ?? user?.username ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '42px',
  padding: '4px 10px',
  borderRadius: '999px',
  backgroundColor: '#dbeafe',
  color: '#1d4ed8',
  fontSize: '0.9rem',
  fontWeight: 700,
}

const paragraphStyle: CSSProperties = {
  color: '#475569',
  lineHeight: 1.6,
}

const requirementsList: RequirementDetail[] = requirements.flatMap((family) =>
  family.sections.map((section) => ({
    id: section.id,
    title: section.label,
    familyTitle: family.title,
    familyObjective: family.objective,
    definedApproach: section.summary,
    customizedApproach: `Use an alternative control design only when it can demonstrate the same security outcome as PCI DSS ${section.id}, with evidence that it continues to support ${family.objective.toLowerCase()}`,
    definedApproachTestingProcedure: `Review documented procedures for ${section.id}, inspect the relevant configurations or operational evidence, interview responsible personnel, and verify the control is operating consistently for ${section.label.toLowerCase()}.`,
    guidance: `This requirement sits within Requirement ${family.id}: ${family.title}. Focus implementation on clear ownership, documented operation, and retained evidence that shows ${section.summary.toLowerCase()}`,
  })),
)

const PCIRequirements: FC = () => {
  const [selectedRequirementId, setSelectedRequirementId] = useState(requirementsList[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [advice, setAdvice] = useState('')
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState('')
  const [lastUpdatedBy, setLastUpdatedBy] = useState('')

  const [assets, setAssets] = useState<StoredAsset[]>([])
  const [tests, setTests] = useState<StoredRequirementTest[]>([])
  const [links, setLinks] = useState<StoredRequirementEvidenceLink[]>([])
  const [selectedTestId, setSelectedTestId] = useState('')

  const [isLoadingTests, setIsLoadingTests] = useState(false)
  const [isSavingTest, setIsSavingTest] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testError, setTestError] = useState('')

  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [linkError, setLinkError] = useState('')

  const [testTitle, setTestTitle] = useState('')
  const [testScopeSummary, setTestScopeSummary] = useState('')
  const [testStatus, setTestStatus] = useState<RequirementTestStatus>('planned')
  const [testSampleSize, setTestSampleSize] = useState('')
  const [testPlannedDate, setTestPlannedDate] = useState('')

  const [linkType, setLinkType] = useState<EvidenceLinkType>('asset')
  const [linkReferenceId, setLinkReferenceId] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const [linkNotes, setLinkNotes] = useState('')

  const selectedRequirement = requirementsList.find((requirement) => requirement.id === selectedRequirementId) ?? requirementsList[0]

  const selectedTest = tests.find((test) => test.testId === selectedTestId)

  const loadTestsForRequirement = async (requirementId: string) => {
    setIsLoadingTests(true)
    setTestError('')
    setTestMessage('')
    setSelectedTestId('')
    setLinks([])
    try {
      const loadedTests = await listRequirementTestsByRequirement(requirementId)
      setTests(loadedTests)
    } catch (error) {
      setTests([])
      setTestError(error instanceof Error ? error.message : 'Could not load requirement tests.')
    } finally {
      setIsLoadingTests(false)
    }
  }

  const loadLinksForTest = async (testId: string) => {
    setIsLoadingLinks(true)
    setLinkError('')
    setLinkMessage('')
    try {
      const loadedLinks = await listRequirementEvidenceLinks(testId)
      setLinks(loadedLinks)
    } catch (error) {
      setLinks([])
      setLinkError(error instanceof Error ? error.message : 'Could not load evidence links.')
    } finally {
      setIsLoadingLinks(false)
    }
  }

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoadingNotes(true)
      setSaveMessage('')
      setSaveError('')
      setNotes('')
      setAdvice('')
      setLastUpdatedAt('')
      setLastUpdatedBy('')
      try {
        const stored = await getRequirementNotes(selectedRequirementId)
        if (stored) {
          setNotes(stored.notes)
          setAdvice(stored.advice)
          setLastUpdatedAt(stored.updatedAt)
          setLastUpdatedBy(stored.updatedBy)
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Could not load notes.')
      } finally {
        setIsLoadingNotes(false)
      }
    }
    void loadNotes()
  }, [selectedRequirementId])

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const loadedAssets = await listAssets()
        setAssets(loadedAssets)
      } catch {
        setAssets([])
      }
    }

    void loadAssets()
  }, [])

  useEffect(() => {
    void loadTestsForRequirement(selectedRequirementId)
  }, [selectedRequirementId])

  useEffect(() => {
    if (!selectedTestId) {
      setLinks([])
      return
    }

    void loadLinksForTest(selectedTestId)
  }, [selectedTestId])

  const handleSelectRequirement = (id: string) => {
    setSelectedRequirementId(id)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')
    setSaveError('')
    try {
      const user = await getAuditUser()
      await saveRequirementNotes(selectedRequirementId, notes, advice, user)
      await safeWriteAuditLog({
        user,
        type: 'change',
        details: `PCI requirement notes updated: ${selectedRequirementId}`,
      })
      const now = new Date().toISOString()
      setLastUpdatedAt(now)
      setLastUpdatedBy(user)
      setSaveMessage('Notes and advice saved.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save notes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateTest = async () => {
    setIsSavingTest(true)
    setTestError('')
    setTestMessage('')

    if (!testTitle.trim() || !testScopeSummary.trim()) {
      setIsSavingTest(false)
      setTestError('Test title and scope summary are required.')
      return
    }

    const parsedSampleSize = testSampleSize.trim().length > 0 ? Number(testSampleSize) : undefined
    if (parsedSampleSize !== undefined && (!Number.isFinite(parsedSampleSize) || parsedSampleSize < 0)) {
      setIsSavingTest(false)
      setTestError('Sample size must be a valid non-negative number.')
      return
    }

    try {
      const user = await getAuditUser()
      const createdTest = await createRequirementTest(
        {
          requirementId: selectedRequirementId,
          title: testTitle,
          scopeSummary: testScopeSummary,
          status: testStatus,
          sampleSize: parsedSampleSize,
          plannedDate: testPlannedDate,
        },
        user,
      )

      await safeWriteAuditLog({
        user,
        type: 'change',
        details: `Requirement test created for ${selectedRequirementId}: ${createdTest.testId}`,
      })

      setTests((prev) => [createdTest, ...prev])
      setSelectedTestId(createdTest.testId)
      setTestTitle('')
      setTestScopeSummary('')
      setTestSampleSize('')
      setTestPlannedDate('')
      setTestStatus('planned')
      setTestMessage('Requirement test session created.')
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to create test session.')
    } finally {
      setIsSavingTest(false)
    }
  }

  const handleAddEvidenceLink = async () => {
    if (!selectedTestId) {
      setLinkError('Select a test session before adding evidence links.')
      return
    }

    if (!linkReferenceId.trim() || !linkLabel.trim()) {
      setLinkError('Reference ID and label are required for an evidence link.')
      return
    }

    setIsSavingLink(true)
    setLinkError('')
    setLinkMessage('')

    try {
      const user = await getAuditUser()
      const createdLink = await addRequirementEvidenceLink(
        {
          testId: selectedTestId,
          linkType,
          referenceId: linkReferenceId,
          label: linkLabel,
          notes: linkNotes,
        },
        user,
      )

      await safeWriteAuditLog({
        user,
        type: 'change',
        details: `Requirement evidence link added: ${createdLink.linkId} for ${selectedTestId}`,
      })

      setLinks((prev) => [createdLink, ...prev])
      setLinkReferenceId('')
      setLinkLabel('')
      setLinkNotes('')
      setLinkMessage('Evidence link added to test session.')
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to add evidence link.')
    } finally {
      setIsSavingLink(false)
    }
  }

  const selectedButtonStyle = (isSelected: boolean): CSSProperties => ({
    width: '100%',
    border: isSelected ? '1px solid #2563eb' : '1px solid #d7deea',
    background: isSelected ? '#eff6ff' : '#ffffff',
    color: '#0f172a',
    borderRadius: '10px',
    padding: '12px 14px',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.98rem',
    fontWeight: 600,
    boxShadow: isSelected ? '0 6px 16px rgba(37, 99, 235, 0.12)' : 'none',
  })

  return (
    <div style={pageStyle}>
      <section style={introCardStyle}>
        <h1 style={{ margin: '0 0 12px', fontSize: '2.5rem' }}>PCI Requirements</h1>
        <p style={{ ...paragraphStyle, marginBottom: '12px' }}>
          This page presents the PCI DSS v4.0.1 requirements as a selectable list. Each row shows the requirement number and requirement name,
          and selecting a row opens a single-page detail view with the defined approach, customized approach, testing procedure, and guidance.
        </p>
        <a
          href="https://docs-prv.pcisecuritystandards.org/PCI%20DSS/Standard/PCI-DSS-v4_0_1.pdf"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'none' }}
        >
          Open the official PCI DSS v4.0.1 document
        </a>

        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>12</div>
            <div style={paragraphStyle}>Requirement families</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>{requirementsList.length}</div>
            <div style={paragraphStyle}>Selectable requirement rows</div>
          </div>
          <div style={summaryCardStyle}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a' }}>v4.0.1</div>
            <div style={paragraphStyle}>Published June 2024</div>
          </div>
        </div>
      </section>

      <section style={contentLayoutStyle}>
        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Requirement List</h2>
            <span style={{ color: '#64748b', fontSize: '0.95rem' }}>Select a requirement to view details</span>
          </div>

          <div style={listStyle}>
            {requirementsList.map((requirement) => (
              <button
                key={requirement.id}
                type="button"
                onClick={() => handleSelectRequirement(requirement.id)}
                style={selectedButtonStyle(requirement.id === selectedRequirement?.id)}
              >
                {requirement.id} {requirement.definedApproach}
              </button>
            ))}
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={badgeStyle}>{selectedRequirement.id}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem' }}>{selectedRequirement.title}</h2>
              <p style={{ ...paragraphStyle, marginTop: '4px' }}>{selectedRequirement.familyTitle}</p>
            </div>
          </div>

          <div style={detailSectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Defined Approach</div>
            <p style={paragraphStyle}>{selectedRequirement.definedApproach}</p>
          </div>

          <div style={detailSectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Customized Approach</div>
            <p style={paragraphStyle}>{selectedRequirement.customizedApproach}</p>
          </div>

          <div style={detailSectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Defined Approach Testing Procedure</div>
            <p style={paragraphStyle}>{selectedRequirement.definedApproachTestingProcedure}</p>
          </div>

          <div style={detailSectionStyle}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Guidance</div>
            <p style={paragraphStyle}>{selectedRequirement.guidance}</p>
          </div>

          <div style={{ ...detailSectionStyle, backgroundColor: '#fff', borderStyle: 'dashed' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Requirement Family Context</div>
            <p style={paragraphStyle}>{selectedRequirement.familyObjective}</p>
          </div>

          <div style={{ ...detailSectionStyle, backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Notes & Advice</div>
            <p style={{ ...paragraphStyle, marginBottom: '12px', fontSize: '0.9rem' }}>
              Use these fields to contextualise this requirement for your environment. Notes and advice are saved to DynamoDB and are specific to each requirement.
            </p>

            {isLoadingNotes ? (
              <p style={{ ...paragraphStyle, fontStyle: 'italic' }}>Loading saved notes…</p>
            ) : (
              <>
                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  Notes
                </label>
                <textarea
                  style={textareaStyle}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setSaveMessage(''); }}
                  placeholder="Add your environment-specific notes for this requirement…"
                />

                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', margin: '12px 0 6px' }}>
                  Advice
                </label>
                <textarea
                  style={textareaStyle}
                  value={advice}
                  onChange={(e) => { setAdvice(e.target.value); setSaveMessage(''); }}
                  placeholder="Add implementation advice or recommendations for your team…"
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { void handleSave() }}
                    disabled={isSaving}
                    style={{ ...saveButtonStyle, opacity: isSaving ? 0.65 : 1 }}
                  >
                    {isSaving ? 'Saving…' : 'Save Notes & Advice'}
                  </button>

                  {saveMessage && (
                    <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.95rem' }}>{saveMessage}</span>
                  )}
                  {saveError && (
                    <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.95rem' }}>{saveError}</span>
                  )}
                </div>

                {lastUpdatedAt && (
                  <p style={{ ...paragraphStyle, marginTop: '10px', fontSize: '0.85rem' }}>
                    Last saved {new Date(lastUpdatedAt).toLocaleString()} by {lastUpdatedBy}
                  </p>
                )}
              </>
            )}
          </div>

          <div style={{ ...detailSectionStyle, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Requirement Testing Sessions</div>
            <p style={{ ...paragraphStyle, marginBottom: '12px', fontSize: '0.9rem' }}>
              Create and manage test sessions for this requirement, then link assets, users, interviews, documents, and screenshots as evidence.
            </p>

            <div style={formGridStyle}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Test Title</label>
                <input
                  style={inputStyle}
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Quarterly test cycle"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Status</label>
                <select
                  style={selectStyle}
                  value={testStatus}
                  onChange={(e) => setTestStatus(e.target.value as RequirementTestStatus)}
                >
                  {REQUIREMENT_TEST_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Sample Size</label>
                <input
                  style={inputStyle}
                  value={testSampleSize}
                  onChange={(e) => setTestSampleSize(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Planned Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={testPlannedDate}
                  onChange={(e) => setTestPlannedDate(e.target.value)}
                />
              </div>
            </div>

            <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginTop: '12px', marginBottom: '6px' }}>Scope Summary</label>
            <textarea
              style={textareaStyle}
              value={testScopeSummary}
              onChange={(e) => setTestScopeSummary(e.target.value)}
              placeholder="Describe assets sampled, teams involved, and evidence plan..."
            />

            <button
              type="button"
              onClick={() => { void handleCreateTest() }}
              disabled={isSavingTest}
              style={{ ...saveButtonStyle, opacity: isSavingTest ? 0.65 : 1 }}
            >
              {isSavingTest ? 'Creating...' : 'Create Test Session'}
            </button>

            {testMessage && <p style={{ color: '#16a34a', marginTop: '10px', marginBottom: 0 }}>{testMessage}</p>}
            {testError && <p style={{ color: '#dc2626', marginTop: '10px', marginBottom: 0 }}>{testError}</p>}

            <div style={{ marginTop: '16px' }}>
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Existing Sessions</div>
              {isLoadingTests ? (
                <p style={{ ...paragraphStyle, margin: 0 }}>Loading test sessions...</p>
              ) : tests.length === 0 ? (
                <p style={{ ...paragraphStyle, margin: 0 }}>No test sessions yet for requirement {selectedRequirementId}.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tests.map((test) => (
                    <button
                      key={test.testId}
                      type="button"
                      onClick={() => setSelectedTestId(test.testId)}
                      style={{
                        ...selectedButtonStyle(test.testId === selectedTestId),
                        fontWeight: 500,
                      }}
                    >
                      {test.title} ({test.status}) • {new Date(test.createdAt).toLocaleDateString()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...detailSectionStyle, backgroundColor: '#f8fafc' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Evidence Links</div>
            {!selectedTest ? (
              <p style={{ ...paragraphStyle, margin: 0 }}>Select a test session to add evidence links.</p>
            ) : (
              <>
                <p style={{ ...paragraphStyle, marginBottom: '10px' }}>
                  Selected session: <strong>{selectedTest.title}</strong>
                </p>

                <div style={formGridStyle}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Link Type</label>
                    <select
                      style={selectStyle}
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value as EvidenceLinkType)}
                    >
                      {EVIDENCE_LINK_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Reference ID</label>
                    <input
                      style={inputStyle}
                      value={linkReferenceId}
                      onChange={(e) => setLinkReferenceId(e.target.value)}
                      placeholder={linkType === 'asset' ? 'asset-id' : 'reference-id'}
                      list={linkType === 'asset' ? 'asset-reference-options' : undefined}
                    />
                    {linkType === 'asset' && assets.length > 0 && (
                      <datalist id="asset-reference-options">
                        {assets.map((asset) => (
                          <option key={asset.assetId} value={asset.assetId}>
                            {asset.assetName}
                          </option>
                        ))}
                      </datalist>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Label</label>
                    <input
                      style={inputStyle}
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Interview with infrastructure lead"
                    />
                  </div>
                </div>

                <label style={{ display: 'block', fontWeight: 600, color: '#0f172a', marginTop: '12px', marginBottom: '6px' }}>Notes</label>
                <textarea
                  style={textareaStyle}
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder="Context for this piece of evidence..."
                />

                <button
                  type="button"
                  onClick={() => { void handleAddEvidenceLink() }}
                  disabled={isSavingLink}
                  style={{ ...saveButtonStyle, opacity: isSavingLink ? 0.65 : 1 }}
                >
                  {isSavingLink ? 'Linking...' : 'Add Evidence Link'}
                </button>

                {linkMessage && <p style={{ color: '#16a34a', marginTop: '10px', marginBottom: 0 }}>{linkMessage}</p>}
                {linkError && <p style={{ color: '#dc2626', marginTop: '10px', marginBottom: 0 }}>{linkError}</p>}

                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Linked Evidence</div>
                  {isLoadingLinks ? (
                    <p style={{ ...paragraphStyle, margin: 0 }}>Loading links...</p>
                  ) : links.length === 0 ? (
                    <p style={{ ...paragraphStyle, margin: 0 }}>No linked evidence for this session yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {links.map((link) => (
                        <div key={link.linkId} style={{ border: '1px solid #dbe4f0', borderRadius: '10px', padding: '10px 12px', background: '#fff' }}>
                          <div style={{ color: '#0f172a', fontWeight: 600 }}>
                            {link.linkType.toUpperCase()} • {link.label}
                          </div>
                          <div style={{ ...paragraphStyle, fontSize: '0.9rem' }}>Reference: {link.referenceId}</div>
                          {link.notes && <div style={{ ...paragraphStyle, fontSize: '0.9rem' }}>Notes: {link.notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default PCIRequirements