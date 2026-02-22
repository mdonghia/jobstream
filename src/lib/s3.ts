import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const isS3Configured =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET

let s3Client: S3Client | null = null

function getS3Client() {
  if (!isS3Configured) return null
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

/**
 * Upload a file to S3 or local filesystem.
 * Returns the URL/path where the file can be accessed.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getS3Client()

  if (client && isS3Configured) {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    )
    return `s3://${key}`
  }

  // Fallback: save to local filesystem
  const fs = await import("fs/promises")
  const path = await import("path")
  const filePath = path.join(process.cwd(), "public", "uploads", key)
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, buffer)
  return `/uploads/${key}`
}

/**
 * Get a URL to access a file.
 * For S3 files, generates a signed URL (valid 1 hour).
 * For local files, returns the path as-is.
 */
export async function getFileUrl(fileUrl: string): Promise<string> {
  if (!fileUrl.startsWith("s3://")) {
    return fileUrl
  }

  const client = getS3Client()
  if (!client) return fileUrl

  const key = fileUrl.replace("s3://", "")
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}
