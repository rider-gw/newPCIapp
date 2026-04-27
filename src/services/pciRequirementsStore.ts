import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

export interface RequirementNotes {
  requirementId: string
  notes: string
  advice: string
  updatedAt: string
  updatedBy: string
}

const tableName = import.meta.env.VITE_DDB_PCI_REQUIREMENTS_TABLE ?? 'pci-requirements'
const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'

const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'An unknown error occurred while accessing the PCI requirements table.'
  }

  if (error.message.includes('VITE_COGNITO_IDENTITY_POOL_ID')) {
    return 'Missing VITE_COGNITO_IDENTITY_POOL_ID. DynamoDB access requires a Cognito Identity Pool linked to your User Pool.'
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

  const ddbClient = new DynamoDBClient({ region, credentials })
  return DynamoDBDocumentClient.from(ddbClient)
}

export const getRequirementNotes = async (requirementId: string): Promise<RequirementNotes | null> => {
  try {
    const client = await createClient()
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { requirementId },
      }),
    )

    const item = result.Item
    if (!item) return null

    return {
      requirementId: typeof item.requirementId === 'string' ? item.requirementId : requirementId,
      notes: typeof item.notes === 'string' ? item.notes : '',
      advice: typeof item.advice === 'string' ? item.advice : '',
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
      updatedBy: typeof item.updatedBy === 'string' ? item.updatedBy : '',
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const saveRequirementNotes = async (
  requirementId: string,
  notes: string,
  advice: string,
  updatedBy: string,
): Promise<void> => {
  try {
    const client = await createClient()
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          requirementId,
          notes,
          advice,
          updatedAt: new Date().toISOString(),
          updatedBy,
        },
      }),
    )
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
