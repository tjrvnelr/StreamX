import { randomUUID } from 'node:crypto';
import path from 'node:path';
import express, {} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { allowedOrigins, env } from './config.js';
import { abortMultipartUpload, completeMultipartUpload, createMultipartUpload, createPartUrl, createSingleUploadUrl, getObjectHead, multipartPartSize, removeVideoObjects, signDownload, uploadUrlExpirySeconds, } from './services/r2.service.js';
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin))
            callback(null, true);
        else
            callback(new Error('Origin is not allowed'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
}));
app.use(express.json({ limit: '256kb' }));
const generalLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
const uploadLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const playbackLimiter = rateLimit({ windowMs: 60_000, limit: 90, standardHeaders: true, legacyHeaders: false });
app.use('/api', generalLimiter);
function errorResponse(res, status, message) {
    res.status(status).json({ error: message });
}
async function authenticate(req, res, optional = false) {
    const authorization = req.header('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        if (optional)
            return true;
        errorResponse(res, 401, 'Sign in to continue.');
        return false;
    }
    try {
        const { data, error } = await admin.auth.getUser(match[1]);
        if (error || !data.user) {
            errorResponse(res, 401, 'Your session has expired. Sign in again.');
            return false;
        }
        req.authUser = { id: data.user.id, email: data.user.email, emailConfirmed: Boolean(data.user.email_confirmed_at) };
        return true;
    }
    catch {
        errorResponse(res, 401, 'Your session could not be verified. Sign in again.');
        return false;
    }
}
function requireAuth(req, res, next) {
    void authenticate(req, res).then((ok) => { if (ok)
        next(); }).catch(() => errorResponse(res, 401, 'Your session could not be verified.'));
}
function optionalAuth(req, res, next) {
    void authenticate(req, res, true).then((ok) => { if (ok)
        next(); }).catch(() => errorResponse(res, 401, 'Your session could not be verified.'));
}
const uploadSchema = z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(10_000).default(''),
    categoryId: z.string().uuid().nullable().optional(),
    visibility: z.enum(['public', 'unlisted', 'private']).default('private'),
    fileName: z.string().trim().min(1).max(255),
    contentType: z.enum(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']),
    sizeBytes: z.number().int().positive(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
const partUrlsSchema = z.object({ partNumbers: z.array(z.number().int().min(1).max(10_000)).min(1).max(200) });
const completeSchema = z.object({
    parts: z.array(z.object({ PartNumber: z.number().int().min(1).max(10_000), ETag: z.string().min(1).max(256) })).max(10_000).optional(),
    durationSeconds: z.number().int().min(0).max(86_400).default(0),
});
const thumbnailSchema = z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024) });
const thumbnailBatchSchema = z.object({ videoIds: z.array(z.string().uuid()).min(1).max(50) });
const visibilitySchema = z.object({ visibility: z.enum(['public', 'unlisted', 'private']) });
const uuidSchema = z.string().uuid();
const uploadMimeByExtension = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska' };
async function getUploadSession(videoId, userId) {
    return admin.from('upload_sessions').select('video_id,user_id,object_key,multipart_upload_id,expected_size,expected_content_type').eq('video_id', videoId).eq('user_id', userId).maybeSingle();
}
async function ownVideo(videoId, userId) {
    return admin.from('videos').select('id,user_id,source_object_key,visibility,processing_status,published_at,thumbnail_key').eq('id', videoId).eq('user_id', userId).maybeSingle();
}
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'streamx-api' }));
app.post('/api/uploads', uploadLimiter, requireAuth, async (req, res) => {
    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success)
        return errorResponse(res, 400, 'Review the upload details and try again.');
    const user = req.authUser;
    if (!user.emailConfirmed)
        return errorResponse(res, 403, 'Verify your email before uploading.');
    const values = parsed.data;
    if (values.sizeBytes > env.MAX_UPLOAD_BYTES)
        return errorResponse(res, 413, `This file exceeds the ${Math.floor(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB upload limit.`);
    const extension = path.extname(values.fileName).toLowerCase();
    if (!uploadMimeByExtension[extension] || uploadMimeByExtension[extension] !== values.contentType)
        return errorResponse(res, 415, 'Use an MP4, WebM, MOV, or MKV video with a matching file type.');
    if (values.categoryId) {
        const { data: category } = await admin.from('categories').select('id').eq('id', values.categoryId).maybeSingle();
        if (!category)
            return errorResponse(res, 400, 'Choose an available category.');
    }
    const videoId = randomUUID();
    const objectKey = `videos/${videoId}/source/original${extension}`;
    const multipart = values.sizeBytes >= 64 * 1024 * 1024;
    let multipartUploadId = null;
    const { error: insertError } = await admin.from('videos').insert({
        id: videoId,
        user_id: user.id,
        title: values.title,
        description: values.description,
        category_id: values.categoryId ?? null,
        visibility: values.visibility,
        processing_status: 'uploading',
        duration_seconds: 0,
        source_object_key: objectKey,
    });
    if (insertError)
        return errorResponse(res, 500, 'Upload setup failed. Please try again.');
    try {
        const tags = [...new Set(values.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
        if (tags.length) {
            const { error: tagError } = await admin.from('video_tags').insert(tags.map((tag) => ({ video_id: videoId, tag })));
            if (tagError)
                throw new Error('Could not save video tags');
        }
        if (multipart)
            multipartUploadId = await createMultipartUpload(objectKey, values.contentType);
        const { error: sessionError } = await admin.from('upload_sessions').insert({
            video_id: videoId,
            user_id: user.id,
            object_key: objectKey,
            multipart_upload_id: multipartUploadId,
            expected_size: values.sizeBytes,
            expected_content_type: values.contentType,
        });
        if (sessionError)
            throw new Error('Could not create upload session');
        const uploadUrl = multipart ? undefined : await createSingleUploadUrl(objectKey, values.contentType, values.sizeBytes);
        return res.status(201).json({
            videoId,
            objectKey,
            multipart,
            partSize: multipart ? multipartPartSize : undefined,
            uploadUrl,
            expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString(),
        });
    }
    catch {
        if (multipartUploadId)
            await abortMultipartUpload(objectKey, multipartUploadId).catch(() => undefined);
        await admin.from('videos').delete().eq('id', videoId).eq('user_id', user.id);
        return errorResponse(res, 502, 'Secure upload setup failed. Please try again.');
    }
});
app.post('/api/uploads/:videoId/parts', uploadLimiter, requireAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    const input = partUrlsSchema.safeParse(req.body);
    if (!videoId.success || !input.success)
        return errorResponse(res, 400, 'Invalid multipart upload request.');
    const { data: session, error } = await getUploadSession(videoId.data, req.authUser.id);
    if (error || !session)
        return errorResponse(res, 404, 'Upload session not found.');
    if (!session.multipart_upload_id)
        return errorResponse(res, 400, 'This upload does not use multipart mode.');
    const maxPart = Math.ceil(Number(session.expected_size) / multipartPartSize);
    if (input.data.partNumbers.some((number) => number > maxPart))
        return errorResponse(res, 400, 'Invalid upload part number.');
    try {
        const parts = await Promise.all(input.data.partNumbers.map(async (partNumber) => {
            const partOffset = (partNumber - 1) * multipartPartSize;
            const partLength = Math.min(multipartPartSize, Number(session.expected_size) - partOffset);
            return { partNumber, url: await createPartUrl(session.object_key, session.multipart_upload_id, partNumber, partLength) };
        }));
        return res.json({ parts, expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString() });
    }
    catch {
        return errorResponse(res, 502, 'Upload links could not be refreshed. Please retry the upload.');
    }
});
app.post('/api/uploads/:videoId/complete', uploadLimiter, requireAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    const input = completeSchema.safeParse(req.body);
    if (!videoId.success || !input.success)
        return errorResponse(res, 400, 'Invalid upload completion request.');
    const { data: session, error: sessionError } = await getUploadSession(videoId.data, req.authUser.id);
    if (sessionError || !session)
        return errorResponse(res, 404, 'Upload session not found.');
    try {
        if (session.multipart_upload_id) {
            const parts = input.data.parts;
            const expectedParts = Math.ceil(Number(session.expected_size) / multipartPartSize);
            if (!parts || parts.length !== expectedParts || parts.some((part, index) => part.PartNumber !== index + 1))
                return errorResponse(res, 400, 'Some upload parts are missing. Retry the upload.');
            await completeMultipartUpload(session.object_key, session.multipart_upload_id, parts);
        }
        const head = await getObjectHead(session.object_key);
        if (Number(head.ContentLength) !== Number(session.expected_size) || head.ContentType !== session.expected_content_type) {
            await removeVideoObjects(videoId.data).catch(() => undefined);
            await admin.from('videos').update({ processing_status: 'failed' }).eq('id', videoId.data).eq('user_id', req.authUser.id);
            await admin.from('upload_sessions').delete().eq('video_id', videoId.data);
            return errorResponse(res, 422, 'The uploaded file did not match its declared type or size.');
        }
        const { data: video } = await ownVideo(videoId.data, req.authUser.id);
        if (!video)
            return errorResponse(res, 404, 'Video record not found.');
        const publishedAt = video.visibility === 'private' ? null : new Date().toISOString();
        const { error: updateError } = await admin.from('videos').update({
            processing_status: 'ready',
            duration_seconds: input.data.durationSeconds,
            published_at: publishedAt,
        }).eq('id', videoId.data).eq('user_id', req.authUser.id);
        if (updateError)
            return errorResponse(res, 500, 'The video uploaded, but its status could not be updated. Retry completion.');
        await admin.from('upload_sessions').delete().eq('video_id', videoId.data);
        return res.json({ ok: true, videoId: videoId.data, processingStatus: 'ready' });
    }
    catch {
        return errorResponse(res, 502, 'The upload could not be verified. Retry completion or restart the upload.');
    }
});
app.post('/api/uploads/:videoId/thumbnail', uploadLimiter, requireAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    const input = thumbnailSchema.safeParse(req.body);
    if (!videoId.success || !input.success)
        return errorResponse(res, 400, 'Choose a JPG, PNG, WebP, or AVIF image under 10 MB.');
    const extension = path.extname(input.data.fileName).toLowerCase();
    const allowedExtensions = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' };
    if (allowedExtensions[extension] !== input.data.contentType)
        return errorResponse(res, 415, 'The thumbnail extension and image type must match.');
    const { data: video, error } = await ownVideo(videoId.data, req.authUser.id);
    if (error || !video || video.processing_status === 'deleting')
        return errorResponse(res, 404, 'Video not found.');
    const key = `videos/${videoId.data}/thumbnails/thumbnail${extension}`;
    try {
        const url = await createSingleUploadUrl(key, input.data.contentType, input.data.sizeBytes);
        const { error: updateError } = await admin.from('videos').update({ thumbnail_key: key }).eq('id', videoId.data).eq('user_id', req.authUser.id);
        if (updateError)
            return errorResponse(res, 500, 'Thumbnail setup failed.');
        return res.json({ uploadUrl: url, expiresAt: new Date(Date.now() + uploadUrlExpirySeconds * 1000).toISOString() });
    }
    catch {
        return errorResponse(res, 502, 'Thumbnail upload could not be prepared.');
    }
});
app.post('/api/uploads/:videoId/abort', uploadLimiter, requireAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    if (!videoId.success)
        return errorResponse(res, 400, 'Invalid upload identifier.');
    const [{ data: session }, { data: video }] = await Promise.all([
        getUploadSession(videoId.data, req.authUser.id),
        ownVideo(videoId.data, req.authUser.id),
    ]);
    if (!session && !video)
        return errorResponse(res, 404, 'Upload session not found.');
    if (video && video.processing_status !== 'uploading')
        return errorResponse(res, 409, 'This video has already finished uploading.');
    if (session?.multipart_upload_id)
        await abortMultipartUpload(session.object_key, session.multipart_upload_id).catch(() => undefined);
    await removeVideoObjects(videoId.data).catch(() => undefined);
    await admin.from('videos').delete().eq('id', videoId.data).eq('user_id', req.authUser.id);
    await admin.from('upload_sessions').delete().eq('video_id', videoId.data).eq('user_id', req.authUser.id);
    return res.json({ ok: true });
});
app.post('/api/media/thumbnails', playbackLimiter, optionalAuth, async (req, res) => {
    const input = thumbnailBatchSchema.safeParse(req.body);
    if (!input.success)
        return errorResponse(res, 400, 'Invalid thumbnail request.');
    const { data, error } = await admin.from('videos').select('id,user_id,thumbnail_key,visibility,processing_status,published_at').in('id', [...new Set(input.data.videoIds)]);
    if (error)
        return errorResponse(res, 500, 'Video artwork could not be loaded.');
    const now = Date.now();
    const allowed = (data ?? []).filter((video) => {
        const publicReady = video.processing_status === 'ready' && (video.visibility === 'public' || video.visibility === 'unlisted') && video.published_at;
        return Boolean(publicReady || (req.authUser && video.user_id === req.authUser.id));
    }).filter((video) => video.thumbnail_key);
    try {
        const thumbnails = Object.fromEntries(await Promise.all(allowed.map(async (video) => [video.id, await signDownload(video.thumbnail_key, 15 * 60)])));
        return res.json({ thumbnails, expiresAt: new Date(now + 15 * 60_000).toISOString() });
    }
    catch {
        return errorResponse(res, 502, 'Video artwork could not be signed.');
    }
});
app.get('/api/videos/:videoId/playback', playbackLimiter, optionalAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    if (!videoId.success)
        return errorResponse(res, 404, 'Video not found.');
    const { data: video, error } = await admin.from('videos').select('id,user_id,source_object_key,visibility,processing_status,published_at').eq('id', videoId.data).maybeSingle();
    if (error || !video || video.processing_status !== 'ready')
        return errorResponse(res, 404, 'Video not found.');
    const publicReady = (video.visibility === 'public' || video.visibility === 'unlisted') && Boolean(video.published_at) && new Date(video.published_at).getTime() <= Date.now();
    const owner = Boolean(req.authUser && req.authUser.id === video.user_id);
    if (!publicReady && !owner)
        return errorResponse(res, 404, 'Video not found.');
    try {
        const expiresIn = 60 * 60;
        const playbackUrl = await signDownload(video.source_object_key, expiresIn);
        return res.json({ playbackUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() });
    }
    catch {
        return errorResponse(res, 502, 'Playback access could not be prepared. Please retry.');
    }
});
app.post('/api/videos/:videoId/view', playbackLimiter, optionalAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    if (!videoId.success)
        return errorResponse(res, 404, 'Video not found.');
    const { data: video } = await admin.from('videos').select('id,user_id,visibility,processing_status,published_at').eq('id', videoId.data).maybeSingle();
    const publicReady = video?.processing_status === 'ready' && (video.visibility === 'public' || video.visibility === 'unlisted') && Boolean(video.published_at) && new Date(video.published_at).getTime() <= Date.now();
    if (!publicReady)
        return errorResponse(res, 404, 'Video not found.');
    const { error } = await admin.rpc('increment_video_view', { p_video_id: videoId.data });
    if (error)
        return errorResponse(res, 500, 'View count could not be recorded.');
    return res.json({ ok: true });
});
app.post('/api/videos/:videoId/visibility', uploadLimiter, requireAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    const input = visibilitySchema.safeParse(req.body);
    if (!videoId.success || !input.success)
        return errorResponse(res, 400, 'Choose a valid visibility setting.');
    const { data: video, error } = await ownVideo(videoId.data, req.authUser.id);
    if (error || !video || video.processing_status !== 'ready')
        return errorResponse(res, 404, 'Ready video not found.');
    const publishedAt = input.data.visibility === 'private' ? null : video.published_at ?? new Date().toISOString();
    const { error: updateError } = await admin.from('videos').update({ visibility: input.data.visibility, published_at: publishedAt }).eq('id', videoId.data).eq('user_id', req.authUser.id);
    if (updateError)
        return errorResponse(res, 500, 'Visibility could not be changed.');
    return res.json({ ok: true });
});
app.delete('/api/videos/:videoId', uploadLimiter, requireAuth, async (req, res) => {
    const videoId = uuidSchema.safeParse(req.params.videoId);
    if (!videoId.success)
        return errorResponse(res, 400, 'Invalid video identifier.');
    const { data: video, error } = await ownVideo(videoId.data, req.authUser.id);
    if (error || !video)
        return errorResponse(res, 404, 'Video not found.');
    const { data: uploadSession } = await getUploadSession(videoId.data, req.authUser.id);
    if (uploadSession?.multipart_upload_id)
        await abortMultipartUpload(uploadSession.object_key, uploadSession.multipart_upload_id).catch(() => undefined);
    await admin.from('videos').update({ processing_status: 'deleting' }).eq('id', videoId.data).eq('user_id', req.authUser.id);
    try {
        await removeVideoObjects(videoId.data);
    }
    catch {
        return errorResponse(res, 502, 'Storage cleanup is pending. Retry deletion from your dashboard.');
    }
    const { error: deleteError } = await admin.from('videos').delete().eq('id', videoId.data).eq('user_id', req.authUser.id);
    if (deleteError)
        return errorResponse(res, 500, 'Storage was removed, but the video record remains. Retry deletion.');
    return res.json({ ok: true });
});
app.use('/api', (_req, res) => errorResponse(res, 404, 'API route not found.'));
app.use((error, _req, res, _next) => {
    void _next;
    if (error instanceof SyntaxError)
        return errorResponse(res, 400, 'Invalid request body.');
    if (error instanceof Error && error.message === 'Origin is not allowed')
        return errorResponse(res, 403, 'This application origin is not allowed.');
    return errorResponse(res, 500, 'The server could not complete this request.');
});
if (process.env.NODE_ENV !== 'test') {
    app.listen(env.PORT, () => { console.info(`StreamX API listening on port ${env.PORT}`); });
}
export { app };
