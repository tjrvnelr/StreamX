import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client, UploadPartCommand, } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, r2Endpoint } from '../config.js';
export const r2 = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    forcePathStyle: true,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
});
export const uploadUrlExpirySeconds = 15 * 60;
export const multipartPartSize = 16 * 1024 * 1024;
export async function createMultipartUpload(key, contentType) {
    const result = await r2.send(new CreateMultipartUploadCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: { application: 'streamx' },
    }));
    if (!result.UploadId)
        throw new Error('Could not initialize multipart upload');
    return result.UploadId;
}
export async function createSingleUploadUrl(key, contentType, contentLength) {
    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ...(contentLength ? { ContentLength: contentLength } : {}),
        Metadata: { application: 'streamx' },
    });
    return getSignedUrl(r2, command, { expiresIn: uploadUrlExpirySeconds });
}
export async function createPartUrl(key, uploadId, partNumber, contentLength) {
    return getSignedUrl(r2, new UploadPartCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        ContentLength: contentLength,
    }), { expiresIn: uploadUrlExpirySeconds });
}
export async function completeMultipartUpload(key, uploadId, parts) {
    return r2.send(new CompleteMultipartUploadCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
    }));
}
export async function abortMultipartUpload(key, uploadId) {
    return r2.send(new AbortMultipartUploadCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, UploadId: uploadId }));
}
export async function signDownload(key, expiresIn = 10 * 60) {
    return getSignedUrl(r2, new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }), { expiresIn });
}
export async function getObjectHead(key) {
    return r2.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
}
export async function removeVideoObjects(videoId) {
    const prefix = `videos/${videoId}/`;
    let continuationToken;
    do {
        const listing = await r2.send(new ListObjectsV2Command({
            Bucket: env.R2_BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        }));
        const objects = listing.Contents?.flatMap((item) => item.Key ? [{ Key: item.Key }] : []) ?? [];
        if (objects.length) {
            const result = await r2.send(new DeleteObjectsCommand({
                Bucket: env.R2_BUCKET_NAME,
                Delete: { Objects: objects, Quiet: true },
            }));
            if (result.Errors?.length)
                throw new Error('One or more R2 objects could not be deleted');
        }
        continuationToken = listing.IsTruncated ? listing.NextContinuationToken : undefined;
    } while (continuationToken);
}
