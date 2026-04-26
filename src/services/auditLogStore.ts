import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

export type AuditType = 'login' | 'logout' | 'change' | 'delete'

export interface AuditLogInput {
  user: string
  type: AuditType
  dateTime?: string
  timezone?: string
  details?: string
}

const tableName = import.meta.env.VITE_DDB_AUDIT_TABLE ?? 'AuditLog'
const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'

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

export const writeAuditLog = async (entry: AuditLogInput): Promise<void> => {
  const client = await createClient()
  const dateTime = entry.dateTime ?? new Date().toISOString()
  const timezone = entry.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        id: crypto.randomUUID(),
        user: entry.user || 'unknown',
        type: entry.type,
        dateTime,
        timezone,
        details: entry.details,
      },
    }),
  )
}

export const safeWriteAuditLog = async (entry: AuditLogInput): Promise<void> => {
  try {
    await writeAuditLog(entry)
  } catch (error) {
    console.warn('Audit log write failed', error)
  }
}
