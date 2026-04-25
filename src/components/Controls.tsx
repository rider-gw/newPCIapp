import { useEffect, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent } from 'react'
import * as XLSX from 'xlsx'
import {
  ASSET_TYPES,
  listAssets,
  saveAssets,
} from '../services/assetsStore'
import type { AssetInput, AssetType, StoredAsset } from '../services/assetsStore'

interface AssetFormState {
  assetName: string
  assetType: AssetType
  purchaseCost: string
}

const parseCost = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[$,\s]/g, '')
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

const mapRowToAsset = (row: Record<string, unknown>): AssetInput | null => {
  const assetName = row['Asset Name'] ?? row.assetName ?? row['asset name']
  const assetType = row['Asset Type'] ?? row.assetType ?? row['asset type']
  const purchaseCost =
    row['Purchase cost'] ?? row['Purchase Cost'] ?? row.purchaseCost ?? row['purchase cost']

  if (typeof assetName !== 'string' || typeof assetType !== 'string') {
    return null
  }

  const normalizedType = assetType.trim().toLowerCase()
  if (!ASSET_TYPES.includes(normalizedType as AssetType)) {
    return null
  }

  const cost = parseCost(purchaseCost)
  if (cost === null) {
    return null
  }

  return {
    assetName: assetName.trim(),
    assetType: normalizedType as AssetType,
    purchaseCost: cost,
  }
}

const controlsSectionStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #d8d8d8',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
}

const downloadTemplate = () => {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet([
    {
      'Asset Name': 'Corporate Laptop 01',
      'Asset Type': 'laptop',
      'Purchase cost': 1499.99,
    },
  ])

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets')
  XLSX.writeFile(workbook, 'assets-template.xlsx')
}

const Controls = () => {
  const [formState, setFormState] = useState<AssetFormState>({
    assetName: '',
    assetType: 'laptop',
    purchaseCost: '',
  })
  const [assets, setAssets] = useState<StoredAsset[]>([])
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const loadAssets = async () => {
    try {
      const loaded = await listAssets()
      setAssets(loaded)
    } catch (loadError) {
      console.error(loadError)
      setError('Could not load assets from DynamoDB. Check your AWS env variables and permissions.')
    }
  }

  useEffect(() => {
    void loadAssets()
  }, [])

  const handleManualAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    const purchaseCost = parseCost(formState.purchaseCost)
    if (!formState.assetName.trim() || purchaseCost === null) {
      setError('Asset Name and a valid Purchase cost are required.')
      return
    }

    setIsSaving(true)
    try {
      await saveAssets([
        {
          assetName: formState.assetName.trim(),
          assetType: formState.assetType,
          purchaseCost,
        },
      ])
      setMessage('Asset saved to DynamoDB.')
      setFormState({ assetName: '', assetType: 'laptop', purchaseCost: '' })
      await loadAssets()
    } catch (saveError) {
      console.error(saveError)
      setError('Failed to save asset to DynamoDB.')
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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: '',
      })

      const mappedAssets = rows.map(mapRowToAsset).filter((asset): asset is AssetInput => asset !== null)

      if (mappedAssets.length === 0) {
        setError(
          'No valid rows found. Use columns: Asset Name, Asset Type, Purchase cost and valid types laptop/server/virtual/cloud/phone.',
        )
        return
      }

      await saveAssets(mappedAssets)
      setMessage(`${mappedAssets.length} assets saved to DynamoDB.`)
      await loadAssets()
    } catch (uploadError) {
      console.error(uploadError)
      setError('Bulk upload failed. Verify spreadsheet format and DynamoDB access.')
    } finally {
      setIsSaving(false)
      event.target.value = ''
    }
  }

  return (
    <section style={{ padding: '24px', textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Controls</h2>
      <p style={{ marginTop: 0 }}>
        Add assets manually or upload an Excel sheet. Data is stored in the DynamoDB table named assets.
      </p>

      <div style={controlsSectionStyle}>
        <h3 style={{ marginTop: 0 }}>Manual Add</h3>
        <form onSubmit={handleManualAdd}>
          <div style={{ display: 'grid', gap: '12px', maxWidth: '420px' }}>
            <label>
              Asset Name
              <input
                type="text"
                value={formState.assetName}
                onChange={(event) => setFormState((prev) => ({ ...prev, assetName: event.target.value }))}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </label>

            <label>
              Asset Type
              <select
                value={formState.assetType}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, assetType: event.target.value as AssetType }))
                }
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              >
                {ASSET_TYPES.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Purchase cost
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.purchaseCost}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, purchaseCost: event.target.value }))
                }
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              style={{ width: 'fit-content', padding: '8px 12px', cursor: 'pointer' }}
            >
              {isSaving ? 'Saving...' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>

      <div style={controlsSectionStyle}>
        <h3 style={{ marginTop: 0 }}>Bulk Load (Excel)</h3>
        <p style={{ marginTop: 0 }}>
          Required columns: Asset Name, Asset Type, Purchase cost.
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

      <div style={controlsSectionStyle}>
        <h3 style={{ marginTop: 0 }}>Stored Assets</h3>
        {assets.length === 0 ? (
          <p>No assets yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Asset Name</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Asset Type</th>
                <th style={{ borderBottom: '1px solid #ddd', textAlign: 'left', padding: '8px' }}>Purchase cost</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.assetId}>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '8px' }}>{asset.assetName}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '8px' }}>{asset.assetType}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '8px' }}>
                    ${asset.purchaseCost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default Controls
