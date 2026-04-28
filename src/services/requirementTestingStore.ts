import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'

export const REQUIREMENT_TEST_STATUSES = ['planned', 'in-progress', 'completed'] as const
export type RequirementTestStatus = (typeof REQUIREMENT_TEST_STATUSES)[number]

export const EVIDENCE_LINK_TYPES = ['asset', 'user', 'interview', 'document', 'screenshot'] as const
export type EvidenceLinkType = (typeof EVIDENCE_LINK_TYPES)[number]

export interface RequirementTestInput {
  requirementId: string
  title: string
  scopeSummary: string
  status: RequirementTestStatus
  sampleSize?: number
  plannedDate?: string
}

export interface StoredRequirementTest extends RequirementTestInput {
  testId: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface RequirementEvidenceLinkInput {
  testId: string
  linkType: EvidenceLinkType
  referenceId: string
  label: string
  notes?: string
}

export interface StoredRequirementEvidenceLink extends RequirementEvidenceLinkInput {
  linkId: string
  createdAt: string
  createdBy: string
}

const testsTableName = import.meta.env.VITE_DDB_REQUIREMENT_TESTS_TABLE ?? 'pci-requirement-tests'
const linksTableName = import.meta.env.VITE_DDB_REQUIREMENT_TEST_LINKS_TABLE ?? 'pci-requirement-test-links'
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

const toStoredRequirementTest = (item: Record<string, unknown>): StoredRequirementTest | null => {
  const testId = item.testId
  const requirementId = item.requirementId
  const title = item.title
  const scopeSummary = item.scopeSummary
  const status = item.status
  const sampleSize = item.sampleSize
  const plannedDate = item.plannedDate
  const createdAt = item.createdAt
  const updatedAt = item.updatedAt
  const createdBy = item.createdBy

  if (
    typeof testId !== 'string' ||
    typeof requirementId !== 'string' ||
    typeof title !== 'string' ||
    typeof scopeSummary !== 'string' ||
    typeof status !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string' ||
    typeof createdBy !== 'string'
  ) {
    return null
  }

  if (!REQUIREMENT_TEST_STATUSES.includes(status as RequirementTestStatus)) {
    return null
  }

  return {
    testId,
    requirementId,
    title,
    scopeSummary,
    status: status as RequirementTestStatus,
    sampleSize: typeof sampleSize === 'number' ? sampleSize : undefined,
    plannedDate: typeof plannedDate === 'string' ? plannedDate : undefined,
    createdAt,
    updatedAt,
    createdBy,
  }
}

const toStoredRequirementEvidenceLink = (
  item: Record<string, unknown>,
): StoredRequirementEvidenceLink | null => {
  const testId = item.testId
  const linkId = item.linkId
  const linkType = item.linkType
  const referenceId = item.referenceId
  const label = item.label
  const notes = item.notes
  const createdAt = item.createdAt
  const createdBy = item.createdBy

  if (
    typeof testId !== 'string' ||
    typeof linkId !== 'string' ||
    typeof linkType !== 'string' ||
    typeof referenceId !== 'string' ||
    typeof label !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof createdBy !== 'string'
  ) {
    return null
  }

  if (!EVIDENCE_LINK_TYPES.includes(linkType as EvidenceLinkType)) {
    return null
  }

  return {
    testId,
    linkId,
    linkType: linkType as EvidenceLinkType,
    referenceId,
    label,
    notes: typeof notes === 'string' ? notes : undefined,
    createdAt,
    createdBy,
  }
}

export const createRequirementTest = async (
  input: RequirementTestInput,
  createdBy: string,
): Promise<StoredRequirementTest> => {
  const client = await createClient()
  const now = new Date().toISOString()
  const test: StoredRequirementTest = {
    testId: crypto.randomUUID(),
    requirementId: input.requirementId.trim(),
    title: input.title.trim(),
    scopeSummary: input.scopeSummary.trim(),
    status: input.status,
    sampleSize: input.sampleSize,
    plannedDate: input.plannedDate?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    createdBy,
  }

  await client.send(
    new PutCommand({
      TableName: testsTableName,
      Item: test,
    }),
  )

  return test
}

export const listRequirementTestsByRequirement = async (
  requirementId: string,
): Promise<StoredRequirementTest[]> => {
  const client = await createClient()

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: testsTableName,
        IndexName: 'requirementId-createdAt-index',
        KeyConditionExpression: 'requirementId = :requirementId',
        ExpressionAttributeValues: {
          ':requirementId': requirementId,
        },
      }),
    )

    return (result.Items ?? [])
      .map((item) => toStoredRequirementTest(item as Record<string, unknown>))
      .filter((item): item is StoredRequirementTest => item !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    // Fallback for prototype environments where the GSI has not yet been created.
    const result = await client.send(
      new ScanCommand({
        TableName: testsTableName,
        FilterExpression: 'requirementId = :requirementId',
        ExpressionAttributeValues: {
          ':requirementId': requirementId,
        },
      }),
    )

    return (result.Items ?? [])
      .map((item) => toStoredRequirementTest(item as Record<string, unknown>))
      .filter((item): item is StoredRequirementTest => item !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export const addRequirementEvidenceLink = async (
  input: RequirementEvidenceLinkInput,
  createdBy: string,
): Promise<StoredRequirementEvidenceLink> => {
  const client = await createClient()
  const link: StoredRequirementEvidenceLink = {
    testId: input.testId,
    linkId: crypto.randomUUID(),
    linkType: input.linkType,
    referenceId: input.referenceId.trim(),
    label: input.label.trim(),
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
    createdBy,
  }

  await client.send(
    new PutCommand({
      TableName: linksTableName,
      Item: link,
    }),
  )

  return link
}

export const listRequirementEvidenceLinks = async (
  testId: string,
): Promise<StoredRequirementEvidenceLink[]> => {
  const client = await createClient()
  const result = await client.send(
    new QueryCommand({
      TableName: linksTableName,
      KeyConditionExpression: 'testId = :testId',
      ExpressionAttributeValues: {
        ':testId': testId,
      },
    }),
  )

  return (result.Items ?? [])
    .map((item) => toStoredRequirementEvidenceLink(item as Record<string, unknown>))
    .filter((item): item is StoredRequirementEvidenceLink => item !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
