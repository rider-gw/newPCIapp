import type { AssetInput, AssetsDiagnostics, StoredAsset } from '../types'

export interface AssetAdapter {
  readonly provider: 'rest' | 'dynamodb'
  listAssets(): Promise<StoredAsset[]>
  saveAssets(assets: AssetInput[]): Promise<void>
  getDiagnostics(): Promise<AssetsDiagnostics>
}
