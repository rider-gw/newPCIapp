import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
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

export interface AssetsDiagnostics {
  tableName: string
  region: string
  identityPoolIdConfigured: boolean
  userPoolIdConfigured: boolean
  hasAwsCredentials: boolean
  isSignedIn: boolean
  error?: string
}

const tableName = import.meta.env.VITE_DDB_ASSETS_TABLE ?? 'assets'
const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'

const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'An unknown error occurred while accessing DynamoDB.'
  }

  if (error.message.includes('VITE_COGNITO_IDENTITY_POOL_ID')) {
    return 'Missing VITE_COGNITO_IDENTITY_POOL_ID. DynamoDB access from the app requires a Cognito Identity Pool linked to your User Pool.'
  }

  if (error.message.includes('No AWS credentials available')) {
    return 'No AWS credentials available for DynamoDB. Link your Cognito User Pool to an Identity Pool and sign in again.'
  }

  if (error.name === 'AccessDeniedException' || error.name === 'UnauthorizedException') {
    return `DynamoDB permission error: ${error.message}`
  }

  if (error.name === 'ResourceNotFoundException') {
    return `DynamoDB table not found. Check that the ${tableName} table exists in ${region}.`
  }

  return error.message
}

export const getAssetsDiagnostics = async (): Promise<AssetsDiagnostics> => {
  const diagnostics: AssetsDiagnostics = {
    tableName,
    region,
    identityPoolIdConfigured: Boolean(identityPoolId),
    userPoolIdConfigured: Boolean(userPoolId),
    hasAwsCredentials: false,
    isSignedIn: false,
  }

  try {
    const session = await fetchAuthSession()
    diagnostics.isSignedIn = Boolean(session.tokens?.idToken)
    diagnostics.hasAwsCredentials = Boolean(session.credentials)

    if (!identityPoolId) {
      diagnostics.error = 'VITE_COGNITO_IDENTITY_POOL_ID is missing.'
    } else if (!diagnostics.isSignedIn) {
      diagnostics.error = 'No Cognito user session found. Please sign in again.'
    } else if (!diagnostics.hasAwsCredentials) {
      diagnostics.error = 'Signed in but no AWS credentials are available from Cognito Identity Pool.'
    }
  } catch (error) {
    diagnostics.error = getErrorMessage(error)
  }

  return diagnostics
}

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
  const credentials = session.credentials

  if (!credentials) {
    throw new Error(
      `No AWS credentials available. Confirm Cognito Identity Pool ${identityPoolId} is configured and linked to User Pool ${userPoolId}.`,
    )
  }

  const ddbClient = new DynamoDBClient({
    region,
    credentials,
  })

  return DynamoDBDocumentClient.from(ddbClient)
}

export const saveAssets = async (assets: AssetInput[]): Promise<void> => {
  try {
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
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const listAssets = async (): Promise<StoredAsset[]> => {
  try {
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
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
