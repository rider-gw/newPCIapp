import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import {
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'

export interface AuditLogRecord {
  id: string
  user: string
  type: string
  dateTime: string
  timezone: string
  details?: string
}

export interface AdminUserRecord {
  username: string
  email: string
  groups: string[]
}

const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')
const auditTableName = import.meta.env.VITE_DDB_AUDIT_TABLE ?? 'AuditLog'
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'

const getCredentials = async () => {
  if (!identityPoolId) {
    throw new Error('VITE_COGNITO_IDENTITY_POOL_ID is required for admin data access.')
  }

  const session = await fetchAuthSession()
  if (!session.credentials) {
    throw new Error('No AWS credentials available. Sign out and sign in again.')
  }

  return session.credentials
}

const parseGroupsFromToken = (groupsClaim: unknown): string[] => {
  if (Array.isArray(groupsClaim)) {
    return groupsClaim.filter((item): item is string => typeof item === 'string')
  }

  if (typeof groupsClaim === 'string' && groupsClaim.length > 0) {
    return [groupsClaim]
  }

  return []
}

const isAdminGroup = (groupName: string): boolean => groupName.toUpperCase().includes('ADMIN')

export const currentUserHasAdminAccess = async (): Promise<boolean> => {
  const session = await fetchAuthSession()
  const groupsClaim = session.tokens?.idToken?.payload?.['cognito:groups']
  const groups = parseGroupsFromToken(groupsClaim)
  return groups.some(isAdminGroup)
}

export const listAuditLogs = async (): Promise<AuditLogRecord[]> => {
  const credentials = await getCredentials()
  const ddbClient = new DynamoDBClient({ region, credentials })
  const docClient = DynamoDBDocumentClient.from(ddbClient)
  const response = await docClient.send(
    new ScanCommand({
      TableName: auditTableName,
    }),
  )

  return (response.Items ?? [])
    .filter((item) => typeof item.id === 'string')
    .map((item) => ({
      id: String(item.id),
      user: String(item.user ?? 'unknown'),
      type: String(item.type ?? 'unknown'),
      dateTime: String(item.dateTime ?? ''),
      timezone: String(item.timezone ?? ''),
      details: item.details ? String(item.details) : undefined,
    }))
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
}

const getUserEmail = (attributes: Array<{ Name?: string; Value?: string }> | undefined): string => {
  const emailAttribute = attributes?.find((attribute) => attribute.Name === 'email')
  return emailAttribute?.Value ?? ''
}

export const listUsersAndGroups = async (): Promise<AdminUserRecord[]> => {
  const credentials = await getCredentials()
  const cognitoClient = new CognitoIdentityProviderClient({ region, credentials })

  const users: AdminUserRecord[] = []
  let paginationToken: string | undefined

  do {
    const usersResponse = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        PaginationToken: paginationToken,
      }),
    )

    for (const user of usersResponse.Users ?? []) {
      const username = user.Username ?? ''
      if (!username) {
        continue
      }

      const groupsResponse = await cognitoClient.send(
        new AdminListGroupsForUserCommand({
          UserPoolId: userPoolId,
          Username: username,
        }),
      )

      users.push({
        username,
        email: getUserEmail(user.Attributes as Array<{ Name?: string; Value?: string }> | undefined),
        groups: (groupsResponse.Groups ?? [])
          .map((group) => group.GroupName)
          .filter((groupName): groupName is string => typeof groupName === 'string'),
      })
    }

    paginationToken = usersResponse.PaginationToken
  } while (paginationToken)

  return users.sort((a, b) => a.username.localeCompare(b.username))
}
