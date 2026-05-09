import { dynamoDbAssetAdapter } from './adapters/dynamoDbAssetAdapter'
import { restAssetAdapter } from './adapters/restAssetAdapter'
import type { AssetAdapter } from './adapters/assetAdapter'
import type { AssetInput, AssetsDiagnostics, AssetProvider, StoredAsset } from './types'

const configuredProvider =
  (import.meta.env.VITE_ASSET_PROVIDER?.toLowerCase() as AssetProvider | undefined) ?? 'rest'

const getAdapter = (): AssetAdapter => {
  if (configuredProvider === 'dynamodb') {
    return dynamoDbAssetAdapter
  }

  return restAssetAdapter
}

const selectedAdapter = getAdapter()

export const getAssetProvider = (): AssetProvider => selectedAdapter.provider

export const listAssets = async (): Promise<StoredAsset[]> => selectedAdapter.listAssets()

export const saveAssets = async (assets: AssetInput[]): Promise<void> => selectedAdapter.saveAssets(assets)

export const getAssetsDiagnostics = async (): Promise<AssetsDiagnostics> => selectedAdapter.getDiagnostics()
