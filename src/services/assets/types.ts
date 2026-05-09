export const ASSET_TYPES = ['laptop', 'server', 'virtual', 'cloud', 'phone'] as const

export type AssetType = (typeof ASSET_TYPES)[number]

export interface AssetInput {
  assetName: string
  assetType: AssetType
  purchaseCost: number
}

export interface StoredAsset extends AssetInput {
  assetId: string
  createdAt: string
}

export type AssetProvider = 'rest' | 'dynamodb'

export interface AssetsDiagnostics {
  provider: AssetProvider
  error?: string
  isSignedIn?: boolean
  hasAwsCredentials?: boolean

  // REST diagnostics
  baseUrl?: string
  assetsPath?: string
  healthPath?: string
  reachable?: boolean
  statusCode?: number

  // DynamoDB diagnostics
  tableName?: string
  region?: string
  identityPoolIdConfigured?: boolean
  userPoolIdConfigured?: boolean
}
