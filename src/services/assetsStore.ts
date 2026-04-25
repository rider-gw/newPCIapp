import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

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

const tableName = import.meta.env.VITE_DDB_ASSETS_TABLE ?? 'assets'
const region = import.meta.env.VITE_AWS_REGION ?? 'us-west-2'
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'

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

const createClient = async (): Promise<DynamoDBDocumentClient> => {
  if (!identityPoolId) {
    throw new Error('VITE_COGNITO_IDENTITY_POOL_ID is required for DynamoDB access.')
  }

  const session = await fetchAuthSession()
  const idToken = session.tokens?.idToken?.toString()

  if (!idToken) {
    throw new Error('No Cognito id token found. Please sign in again.')
  }

  const credentials = fromCognitoIdentityPool({
    clientConfig: { region },
    identityPoolId,
    logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken,
    },
  })

  const ddbClient = new DynamoDBClient({
    region,
    credentials,
  })

  return DynamoDBDocumentClient.from(ddbClient)
}

export const saveAssets = async (assets: AssetInput[]): Promise<void> => {
  const client = await createClient()
  const createdAt = new Date().toISOString()

  for (const asset of assets) {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          assetId: crypto.randomUUID(),
          assetName: asset.assetName,
          assetType: asset.assetType,
          purchaseCost: asset.purchaseCost,
          createdAt,
        },
      }),
    )
  }
}

export const listAssets = async (): Promise<StoredAsset[]> => {
  const client = await createClient()
  const response = await client.send(
    new ScanCommand({
      TableName: tableName,
    }),
  )

  return (response.Items ?? [])
    .map((item) => toAsset(item as Record<string, unknown>))
    .filter((item): item is StoredAsset => item !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
