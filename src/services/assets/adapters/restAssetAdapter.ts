import { fetchAuthSession } from 'aws-amplify/auth'
import type { AssetAdapter } from './assetAdapter'
import { ASSET_TYPES } from '../types'
import type { AssetInput, AssetType, AssetsDiagnostics, StoredAsset } from '../types'

interface RestContractAdapter {
  toSaveRequest(assets: AssetInput[]): unknown
  fromListResponse(payload: unknown): StoredAsset[]
}

const baseUrl = import.meta.env.VITE_ASSET_API_BASE_URL ?? '/api'
const assetsPath = import.meta.env.VITE_ASSET_API_ASSETS_PATH ?? '/assets'
const healthPath = import.meta.env.VITE_ASSET_API_HEALTH_PATH ?? '/health'
const contractType = import.meta.env.VITE_ASSET_API_CONTRACT ?? 'native'

const toAsset = (item: Record<string, unknown>): StoredAsset | null => {
  const assetName = item.assetName
  const assetType = item.assetType
  const purchaseCost = item.purchaseCost
  const assetId = item.assetId
  const createdAt = item.createdAt

  if (
    typeof assetName !== 'string' ||
    typeof assetType !== 'string' ||
    typeof purchaseCost !== 'number' ||
    typeof assetId !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null
  }

  if (!ASSET_TYPES.includes(assetType as AssetType)) {
    return null
  }

  return {
    assetName,
    assetType: assetType as AssetType,
    purchaseCost,
    assetId,
    createdAt,
  }
}

const nativeContractAdapter: RestContractAdapter = {
  toSaveRequest(assets) {
    return { assets }
  },
  fromListResponse(payload) {
    if (Array.isArray(payload)) {
      return payload
        .map((item) => toAsset(item as Record<string, unknown>))
        .filter((item): item is StoredAsset => item !== null)
    }

    if (payload && typeof payload === 'object') {
      const candidateCollections = [
        (payload as { assets?: unknown }).assets,
        (payload as { items?: unknown }).items,
        (payload as { data?: unknown }).data,
      ]

      const collection = candidateCollections.find(Array.isArray)
      if (collection) {
        return collection
          .map((item) => toAsset(item as Record<string, unknown>))
          .filter((item): item is StoredAsset => item !== null)
      }
    }

    return []
  },
}

// Example mapping for future third-party payloads.
const serviceNowContractAdapter: RestContractAdapter = {
  toSaveRequest(assets) {
    return {
      records: assets.map((asset) => ({
        name: asset.assetName,
        category: asset.assetType,
        cost: asset.purchaseCost,
      })),
    }
  },
  fromListResponse(payload) {
    if (!payload || typeof payload !== 'object') {
      return []
    }

    const records = (payload as { result?: unknown }).result
    if (!Array.isArray(records)) {
      return []
    }

    return records
      .map((record) => {
        const input = record as Record<string, unknown>
        const assetName = input.name
        const assetType = input.category
        const purchaseCost = input.cost
        const assetId = input.sys_id
        const createdAt = input.sys_created_on

        if (
          typeof assetName !== 'string' ||
          typeof assetType !== 'string' ||
          typeof purchaseCost !== 'number' ||
          typeof assetId !== 'string' ||
          typeof createdAt !== 'string'
        ) {
          return null
        }

        const normalizedType = assetType.trim().toLowerCase()
        if (!ASSET_TYPES.includes(normalizedType as AssetType)) {
          return null
        }

        return {
          assetName,
          assetType: normalizedType as AssetType,
          purchaseCost,
          assetId,
          createdAt,
        }
      })
      .filter((item): item is StoredAsset => item !== null)
  },
}

const getContractAdapter = (): RestContractAdapter => {
  if (contractType.toLowerCase() === 'servicenow') {
    return serviceNowContractAdapter
  }

  return nativeContractAdapter
}

const trimSlashes = (value: string): string => value.replace(/\/+$/, '')
const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`)

const buildUrl = (path: string): string => `${trimSlashes(baseUrl)}${ensureLeadingSlash(path)}`

const getAuthToken = async (): Promise<string | undefined> => {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString()
  } catch {
    return undefined
  }
}

const buildHeaders = async (includeJsonContentType: boolean): Promise<HeadersInit> => {
  const token = await getAuthToken()
  const headers: Record<string, string> = {}

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

const sortByNewest = (assets: StoredAsset[]): StoredAsset[] =>
  [...assets].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const restAssetAdapter: AssetAdapter = {
  provider: 'rest',

  async listAssets() {
    const contractAdapter = getContractAdapter()
    const response = await fetch(buildUrl(assetsPath), {
      method: 'GET',
      headers: await buildHeaders(false),
    })

    if (!response.ok) {
      throw new Error(`Asset API list failed (${response.status})`)
    }

    const payload = (await response.json()) as unknown
    return sortByNewest(contractAdapter.fromListResponse(payload))
  },

  async saveAssets(assets) {
    const contractAdapter = getContractAdapter()
    const response = await fetch(buildUrl(assetsPath), {
      method: 'POST',
      headers: await buildHeaders(true),
      body: JSON.stringify(contractAdapter.toSaveRequest(assets)),
    })

    if (!response.ok) {
      throw new Error(`Asset API save failed (${response.status})`)
    }
  },

  async getDiagnostics(): Promise<AssetsDiagnostics> {
    const diagnostics: AssetsDiagnostics = {
      provider: 'rest',
      baseUrl,
      assetsPath,
      healthPath,
      isSignedIn: false,
      reachable: false,
    }

    try {
      const token = await getAuthToken()
      diagnostics.isSignedIn = Boolean(token)

      const response = await fetch(buildUrl(healthPath), {
        method: 'GET',
        headers: await buildHeaders(false),
      })

      diagnostics.reachable = response.ok
      diagnostics.statusCode = response.status
      if (!response.ok) {
        diagnostics.error = `Health check failed (${response.status})`
      }
    } catch (error) {
      diagnostics.error = error instanceof Error ? error.message : 'Failed to connect to asset API.'
    }

    return diagnostics
  },
}
