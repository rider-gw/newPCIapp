import { fetchAuthSession } from 'aws-amplify/auth'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

export const CONTROL_TYPES = ['standard', 'customised'] as const

export type ControlType = (typeof CONTROL_TYPES)[number]

export interface ControlInput {
  controlId: string
  requirement: string
  controlType: ControlType
  controlDescription: string
  evidence: string
  riskSummary: string
  implementationNotes: string
}

export interface StoredControl extends ControlInput {
  id: string
  createdAt: string
}

const tableName = import.meta.env.VITE_DDB_CONTROLS_TABLE ?? 'controls'
const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'

const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'An unknown error occurred while accessing the controls table.'
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

const toControl = (item: Record<string, unknown>): StoredControl | null => {
  const id = item.id
  const controlId = item.controlId
  const requirement = item.requirement
  const controlType = item.controlType
  const controlDescription = item.controlDescription
  const evidence = item.evidence
  const riskSummary = item.riskSummary
  const implementationNotes = item.implementationNotes
  const createdAt = item.createdAt

  if (
    typeof id !== 'string' ||
    typeof controlId !== 'string' ||
    typeof requirement !== 'string' ||
    typeof controlType !== 'string' ||
    typeof controlDescription !== 'string' ||
    typeof evidence !== 'string' ||
    typeof riskSummary !== 'string' ||
    typeof implementationNotes !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null
  }

  if (!CONTROL_TYPES.includes(controlType as ControlType)) {
    return null
  }

  return {
    id,
    controlId,
    requirement,
    controlType: controlType as ControlType,
    controlDescription,
    evidence,
    riskSummary,
    implementationNotes,
    createdAt,
  }
}

export const saveControls = async (controls: ControlInput[]): Promise<void> => {
  try {
    const client = await createClient()
    const createdAt = new Date().toISOString()

    for (const control of controls) {
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            id: crypto.randomUUID(),
            controlId: control.controlId,
            requirement: control.requirement,
            controlType: control.controlType,
            controlDescription: control.controlDescription,
            evidence: control.evidence,
            riskSummary: control.riskSummary,
            implementationNotes: control.implementationNotes,
            createdAt,
          },
        }),
      )
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const listControls = async (): Promise<StoredControl[]> => {
  try {
    const client = await createClient()
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
      }),
    )

    return (response.Items ?? [])
      .map((item) => toControl(item as Record<string, unknown>))
      .filter((item): item is StoredControl => item !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}