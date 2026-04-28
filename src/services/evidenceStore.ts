import { fetchAuthSession } from 'aws-amplify/auth'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'

const bucketName = import.meta.env.VITE_S3_EVIDENCE_BUCKET ?? 'pci-evidence-uploads'
const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID

async function getS3Client(): Promise<S3Client> {
  const session = await fetchAuthSession()
  const idToken = session.tokens?.idToken?.toString()

  if (!idToken || !identityPoolId) {
    throw new Error('Not authenticated or identity pool not configured')
  }

  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string
  const providerKey = `cognito-idp.${region}.amazonaws.com/${userPoolId}`

  return new S3Client({
    region,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region },
      identityPoolId,
      logins: { [providerKey]: idToken },
    }),
  })
}

/**
 * Upload a file to S3. Returns the S3 object key.
 * Key format: evidence/{testId}/{timestamp}-{fileName}
 */
export async function uploadEvidenceFile(
  file: File,
  testId: string,
): Promise<{ key: string; fileName: string; fileSize: number; contentType: string }> {
  const s3 = await getS3Client()
  const timestamp = Date.now()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `evidence/${testId}/${timestamp}-${safeFileName}`

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: file.type || 'application/octet-stream',
    ContentDisposition: `attachment; filename="${file.name}"`,
    Metadata: {
      originalName: file.name,
      testId,
      uploadedAt: new Date().toISOString(),
    },
  })

  await s3.send(command)

  return {
    key,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || 'application/octet-stream',
  }
}

/**
 * Generate a presigned URL to download/view an evidence file.
 * URL expires after 15 minutes.
 */
export async function getEvidenceFileUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const s3 = await getS3Client()

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds })
}

/**
 * Delete an evidence file from S3.
 */
export async function deleteEvidenceFile(key: string): Promise<void> {
  const s3 = await getS3Client()

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await s3.send(command)
}
