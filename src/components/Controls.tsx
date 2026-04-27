import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import * as XLSX from 'xlsx'
import { fetchUserAttributes, getCurrentUser } from '@aws-amplify/auth'
import { safeWriteAuditLog } from '../services/auditLogStore'
import { CONTROL_TYPES, listControls, saveControls } from '../services/controlsStore'
import type { ControlInput, ControlType, StoredControl } from '../services/controlsStore'

const sectionStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d8d8d8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
}

interface ControlFormState {
  controlId: string
  requirement: string
  controlType: ControlType
  controlDescription: string
  evidence: string
  riskSummary: string
  implementationNotes: string
}

const tableCellStyle: CSSProperties = {
  borderBottom: '1px solid #f0f0f0',
  padding: '8px',
  verticalAlign: 'top',
}

const createEmptyFormState = (): ControlFormState => ({
  controlId: '',
  requirement: '',
  controlType: 'standard',
  controlDescription: '',
  evidence: '',
  riskSummary: '',
  implementationNotes: '',
})

const normalizeControlType = (value: unknown): ControlType | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  return CONTROL_TYPES.includes(normalized as ControlType) ? (normalized as ControlType) : null
}

const normalizeText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return ''
}

const mapRowToControl = (row: Record<string, unknown>): ControlInput | null => {
  const controlId = normalizeText(row['ControlID'] ?? row['Control ID'] ?? row.controlId ?? row['control id'])
  const requirement = normalizeText(row.Requirement ?? row.requirement)
  const controlType = normalizeControlType(
    row['Control Type'] ?? row.controlType ?? row['control type'],
  )
  const controlDescription = normalizeText(
    row['Control Description'] ?? row.controlDescription ?? row['control description'],
  )
  const evidence = normalizeText(row.Evidence ?? row.evidence)
  const riskSummary = normalizeText(row['Risk Summary'] ?? row.riskSummary ?? row['risk summary'])
  const implementationNotes = normalizeText(
    row['Implementation Notes'] ?? row.implementationNotes ?? row['implementation notes'],
  )

  if (
    !controlId ||
    !requirement ||
    !controlType ||
    !controlDescription ||
    !evidence ||
    !riskSummary ||
    !implementationNotes
  ) {
    return null
  }

  return {
    controlId,
    requirement,
    controlType,
    controlDescription,
    evidence,
    riskSummary,
    implementationNotes,
  }
}

const downloadTemplate = () => {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet([
    {
      ControlID: '1.2.4',
      Requirement: 'PCI DSS 1.2.4',
      'Control Type': 'standard',
      'Control Description': 'Inbound and outbound network connections are restricted to those necessary for the environment.',
      Evidence: 'Firewall ruleset export and approval record',
      'Risk Summary': 'Unauthorized network paths could expose cardholder data.',
      'Implementation Notes': 'Reviewed quarterly by infrastructure and security teams.',
    },
  ])

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Controls')
  XLSX.writeFile(workbook, 'controls-template.xlsx')
}

const getAuditUser = async (): Promise<string> => {
  try {
    const user = await getCurrentUser()
    const attributes = await fetchUserAttributes()
    return attributes.email || user?.username || 'unknown'
  } catch {
    return 'unknown'
  }
}

const Controls = () => {
  const [formState, setFormState] = useState<ControlFormState>(createEmptyFormState())
  const [controls, setControls] = useState<StoredControl[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadControls = async () => {
    try {
      const loaded = await listControls()
      setControls(loaded)
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : 'Could not load controls from DynamoDB.')
    }
  }

  useEffect(() => {
    void loadControls()
  }, [])

  const handleManualAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    const control: ControlInput = {
      controlId: formState.controlId.trim(),
      requirement: formState.requirement.trim(),
      controlType: formState.controlType,
      controlDescription: formState.controlDescription.trim(),
      evidence: formState.evidence.trim(),
      riskSummary: formState.riskSummary.trim(),
      implementationNotes: formState.implementationNotes.trim(),
    }

    if (Object.values(control).some((value) => typeof value === 'string' && value.length === 0)) {
      setError('All control fields are required.')
      return
    }

    setIsSaving(true)
    try {
      await saveControls([control])
      const auditUser = await getAuditUser()
      await safeWriteAuditLog({
        user: auditUser,
        type: 'change',
        details: `Manual control add: ${control.controlId} (${control.requirement})`,
      })
      setMessage('Control saved to DynamoDB.')
      setFormState(createEmptyFormState())
      await loadControls()
    } catch (saveError) {
      console.error(saveError)
      setError(saveError instanceof Error ? saveError.message : 'Failed to save control to DynamoDB.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setMessage('')
    setError('')
    setIsSaving(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const firstSheetName = workbook.SheetNames[0]
      const firstSheet = workbook.Sheets[firstSheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
      const mappedControls = rows
        .map(mapRowToControl)
        .filter((control): control is ControlInput => control !== null)

      if (mappedControls.length === 0) {
        setError(
          'No valid rows found. Use columns: ControlID, Requirement, Control Type, Control Description, Evidence, Risk Summary, Implementation Notes.',
        )
        return
      }

      await saveControls(mappedControls)
      const auditUser = await getAuditUser()
      await safeWriteAuditLog({
        user: auditUser,
        type: 'change',
        details: `Bulk control import: ${mappedControls.length} records`,
      })
      setMessage(`${mappedControls.length} controls saved to DynamoDB.`)
      await loadControls()
    } catch (uploadError) {
      console.error(uploadError)
      setError(uploadError instanceof Error ? uploadError.message : 'Bulk upload failed.')
    } finally {
      setIsSaving(false)
      event.target.value = ''
    }
  }

  return (
    <section style={{ padding: '24px', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Controls</h2>
      <p style={{ marginTop: 0 }}>
        Manage PCI-DSS controls using manual entry or bulk Excel upload. Data is stored in DynamoDB.
      </p>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Manual Add</h3>
        <form onSubmit={handleManualAdd}>
          <div style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
            <label>
              ControlID
              <input
                type="text"
                value={formState.controlId}
                onChange={(event) => setFormState((prev) => ({ ...prev, controlId: event.target.value }))}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </label>

            <label>
              Requirement (PCI-DSS)
              <input
                type="text"
                value={formState.requirement}
                onChange={(event) => setFormState((prev) => ({ ...prev, requirement: event.target.value }))}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </label>

            <label>
              Control Type
              <select
                value={formState.controlType}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, controlType: event.target.value as ControlType }))
                }
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              >
                {CONTROL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Control Description
              <textarea
                value={formState.controlDescription}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, controlDescription: event.target.value }))
                }
                rows={3}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
                required
              />
            </label>

            <label>
              Evidence
              <textarea
                value={formState.evidence}
                onChange={(event) => setFormState((prev) => ({ ...prev, evidence: event.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
                required
              />
            </label>

            <label>
              Risk Summary
              <textarea
                value={formState.riskSummary}
                onChange={(event) => setFormState((prev) => ({ ...prev, riskSummary: event.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
                required
              />
            </label>

            <label>
              Implementation Notes
              <textarea
                value={formState.implementationNotes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, implementationNotes: event.target.value }))
                }
                rows={3}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }}
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              style={{ width: 'fit-content', padding: '8px 12px', cursor: 'pointer' }}
            >
              {isSaving ? 'Saving...' : 'Save Control'}
            </button>
          </div>
        </form>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Bulk Load (Excel)</h3>
        <p style={{ marginTop: 0 }}>
          Required columns: ControlID, Requirement, Control Type, Control Description, Evidence, Risk Summary, Implementation Notes.
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          style={{ marginBottom: '12px', padding: '8px 12px', cursor: 'pointer' }}
        >
          Download Template
        </button>
        <br />
        <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} disabled={isSaving} />
      </div>

      {message && <p style={{ color: '#0a7d26' }}>{message}</p>}
      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Stored Controls</h3>
        {controls.length === 0 ? (
          <p>No controls yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>ControlID</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Requirement</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Control Type</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Control Description</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Evidence</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Risk Summary</th>
                  <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Implementation Notes</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((control) => (
                  <tr key={control.id}>
                    <td style={tableCellStyle}>{control.controlId}</td>
                    <td style={tableCellStyle}>{control.requirement}</td>
                    <td style={tableCellStyle}>{control.controlType}</td>
                    <td style={tableCellStyle}>{control.controlDescription}</td>
                    <td style={tableCellStyle}>{control.evidence}</td>
                    <td style={tableCellStyle}>{control.riskSummary}</td>
                    <td style={tableCellStyle}>{control.implementationNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default Controls
