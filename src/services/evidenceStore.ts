import { fetchAuthSession } from 'aws-amplify/auth'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const bucketName = import.meta.env.VITE_S3_EVIDENCE_BUCKET ?? 'pci-evidence-uploads'
const region =
  import.meta.env.VITE_AWS_REGION ?? (import.meta.env.VITE_COGNITO_USER_POOL_ID?.split('_')[0] ?? 'us-west-2')

async function getS3Client(): Promise<S3Client> {
  const session = await fetchAuthSession()
  const credentials = session.credentials

  if (!credentials) {
    throw new Error('Not authenticated — no AWS credentials available.')
  }

  return new S3Client({
    region,
    credentials,
  })
}

/**
 * Upload a file to S3. Returns the S3 object key.
 * Key format: evidence/{testId}/{timestamp}-{fileName}
 */
export async function uploadEvidenceFile(
  file: File,
  testId: string,
  options?: { onProgress?: (percent: number) => void },
): Promise<{ key: string; fileName: string; fileSize: number; contentType: string }> {
  const reportProgress = (value: number) => {
    options?.onProgress?.(Math.max(0, Math.min(100, value)))
  }

  reportProgress(5)
  const s3 = await getS3Client()
  const timestamp = Date.now()
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `evidence/${testId}/${timestamp}-${safeFileName}`
  reportProgress(25)
  const fileBytes = new Uint8Array(await file.arrayBuffer())
  reportProgress(60)

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBytes,
    ContentType: file.type || 'application/octet-stream',
    ContentDisposition: `attachment; filename="${file.name}"`,
    Metadata: {
      originalName: file.name,
      testId,
      uploadedAt: new Date().toISOString(),
    },
  })

  await s3.send(command)
  reportProgress(100)

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
