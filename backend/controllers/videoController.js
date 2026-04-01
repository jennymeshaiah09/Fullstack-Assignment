const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const { Storage } = require('@google-cloud/storage');
const Video = require('../models/Video');
const s3Client = require('../config/s3');

const GCS_BUCKET = 'pulsevid-video-intel-tmp';

// Support both local keyfile and env variable (for production/Render)
let googleCredentials;
if (process.env.GOOGLE_CREDENTIALS_JSON) {
  googleCredentials = { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) };
} else {
  googleCredentials = { keyFilename: path.join(__dirname, '../config/google-credentials.json') };
}

const videoIntelligenceClient = new VideoIntelligenceServiceClient(googleCredentials);
const gcsClient = new Storage(googleCredentials);

const BUCKET = process.env.AWS_S3_BUCKET;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Download S3 file to a temp path
const downloadFromS3 = async (s3Key, destPath) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  const response = await s3Client.send(command);
  const writeStream = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    response.Body.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
};

// Extract thumbnail using FFmpeg and upload to S3
const generateThumbnail = async (videoId, s3Key) => {
  const tmpDir = os.tmpdir();
  const tmpVideo = path.join(tmpDir, `${videoId}_video.mp4`);
  const tmpThumb = path.join(tmpDir, `${videoId}_thumb.jpg`);

  try {
    await downloadFromS3(s3Key, tmpVideo);

    await new Promise((resolve, reject) => {
      ffmpeg(tmpVideo)
        .screenshots({
          timestamps: ['00:00:02'],
          filename: `${videoId}_thumb.jpg`,
          folder: tmpDir,
          size: '640x360',
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const thumbBuffer = fs.readFileSync(tmpThumb);
    const thumbKey = `thumbnails/${videoId}.jpg`;

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: 'image/jpeg',
    }));

    const thumbUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbKey}`;

    await Video.findByIdAndUpdate(videoId, { thumbnailUrl: thumbUrl });

    return thumbUrl;
  } catch (err) {
    console.error('Thumbnail generation error:', err.message);
    return null;
  } finally {
    if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo);
    if (fs.existsSync(tmpThumb)) fs.unlinkSync(tmpThumb);
  }
};

// Google returns numeric enum values: 0=UNSPECIFIED, 1=VERY_UNLIKELY, 2=UNLIKELY, 3=POSSIBLE, 4=LIKELY, 5=VERY_LIKELY
const LIKELIHOOD_SCORES = {
  0: 0,   // LIKELIHOOD_UNSPECIFIED
  1: 0,   // VERY_UNLIKELY
  2: 10,  // UNLIKELY
  3: 40,  // POSSIBLE
  4: 75,  // LIKELY
  5: 95,  // VERY_LIKELY
  // string fallbacks
  LIKELIHOOD_UNSPECIFIED: 0,
  VERY_UNLIKELY: 0,
  UNLIKELY: 10,
  POSSIBLE: 40,
  LIKELY: 75,
  VERY_LIKELY: 95,
};

const VIOLENCE_LABELS = new Set([
  'violence', 'fighting', 'fight', 'weapon', 'gun', 'knife', 'blood', 'shooting',
  'explosion', 'combat', 'murder', 'killing', 'assault', 'attack', 'war', 'battle',
]);

const HATE_LABELS = new Set([
  'hate', 'racism', 'discrimination', 'extremism', 'terrorist', 'terrorism',
]);

const INLINE_SIZE_LIMIT = 40 * 1024 * 1024; // 40MB — use GCS URI above this

const analyseWithGoogleVideoIntelligence = async (s3Key) => {
  const tmpDir = os.tmpdir();
  const tmpVideo = path.join(tmpDir, `analyse_${uuidv4()}.mp4`);
  let gcsObjectName = null;

  try {
    await downloadFromS3(s3Key, tmpVideo);
    const fileSize = fs.statSync(tmpVideo).size;

    let explicitRequest, labelRequest;

    if (fileSize > INLINE_SIZE_LIMIT) {
      gcsObjectName = `tmp/${uuidv4()}_video.mp4`;
      console.log(`[ANALYSE] File is ${Math.round(fileSize / 1024 / 1024)}MB — uploading to GCS...`);
      await gcsClient.bucket(GCS_BUCKET).upload(tmpVideo, { destination: gcsObjectName });
      const gcsUri = `gs://${GCS_BUCKET}/${gcsObjectName}`;
      console.log(`[ANALYSE] GCS upload done — URI: ${gcsUri}`);
      explicitRequest = { inputUri: gcsUri, features: ['EXPLICIT_CONTENT_DETECTION'] };
      labelRequest    = { inputUri: gcsUri, features: ['LABEL_DETECTION'] };
    } else {
      const videoBuffer = fs.readFileSync(tmpVideo);
      const inputContent = videoBuffer.toString('base64');
      explicitRequest = { inputContent, features: ['EXPLICIT_CONTENT_DETECTION'] };
      labelRequest    = { inputContent, features: ['LABEL_DETECTION'] };
    }

    console.log(`[ANALYSE] Running EXPLICIT_CONTENT_DETECTION + LABEL_DETECTION in parallel...`);

    // Fire both API calls simultaneously
    const [[explicitOp], [labelOp]] = await Promise.all([
      videoIntelligenceClient.annotateVideo(explicitRequest),
      videoIntelligenceClient.annotateVideo(labelRequest),
    ]);

    // Wait for both to finish simultaneously
    const [[explicitResult], [labelResult]] = await Promise.all([
      explicitOp.promise(),
      labelOp.promise(),
    ]);

    console.log(`[ANALYSE] Both API calls complete`);

    // Adult content
    const frames = explicitResult?.annotationResults?.[0]?.explicitAnnotation?.frames || [];
    console.log(`[ANALYSE] Frames: ${frames.length} | Likelihoods:`, frames.map(f => f.pornographyLikelihood));
    let maxAdultScore = 0;
    for (const frame of frames) {
      const score = LIKELIHOOD_SCORES[frame.pornographyLikelihood] || 0;
      if (score > maxAdultScore) maxAdultScore = score;
    }

    // Violence & hate from labels
    const labelAnnotations = labelResult?.annotationResults?.[0] || {};
    const allLabels = [
      ...(labelAnnotations.segmentLabelAnnotations || []),
      ...(labelAnnotations.shotLabelAnnotations || []),
    ];

    let maxViolenceScore = 0;
    let maxHateScore = 0;

    for (const labelAnnotation of allLabels) {
      const labelName = (labelAnnotation.entity?.description || '').toLowerCase();
      const maxConfidence = Math.max(...(labelAnnotation.segments || []).map(s => s.confidence || 0));
      const score = Math.round(maxConfidence * 100);
      if (VIOLENCE_LABELS.has(labelName) && score > maxViolenceScore) maxViolenceScore = score;
      if (HATE_LABELS.has(labelName) && score > maxHateScore) maxHateScore = score;
    }

    const sensitivityScore = Math.max(maxAdultScore, maxViolenceScore, maxHateScore);
    const isFlagged = sensitivityScore >= 40;

    return {
      status: isFlagged ? 'flagged' : 'safe',
      sensitivityScore,
      sensitivityDetails: {
        violence: maxViolenceScore >= 40,
        adult: maxAdultScore >= 40,
        hate: maxHateScore >= 40,
      },
    };
  } finally {
    if (fs.existsSync(tmpVideo)) fs.unlinkSync(tmpVideo);
    if (gcsObjectName) {
      gcsClient.bucket(GCS_BUCKET).file(gcsObjectName).delete().catch(() => {});
    }
  }
};

const processVideo = async (videoId, io) => {
  try {
    console.log(`\n[PROCESS] Starting processing for video: ${videoId}`);
    await Video.findByIdAndUpdate(videoId, { status: 'processing', updatedAt: new Date() });

    const video = await Video.findById(videoId);
    console.log(`[PROCESS] Video: "${video.title}" | S3 key: ${video.s3Key} | Size: ${(video.fileSize / 1024 / 1024).toFixed(1)}MB`);

    if (video?.s3Key) {
      generateThumbnail(videoId, video.s3Key);
    }

    const emitProgress = async (stage, progress) => {
      console.log(`[PROCESS] Stage: ${stage} | Progress: ${progress}%`);
      await Video.findByIdAndUpdate(videoId, { processingStage: stage, processingProgress: progress, updatedAt: new Date() });
      if (io) io.emit('processing_progress', { videoId: videoId.toString(), stage, progress });
    };

    await emitProgress('validating', 20);
    await sleep(800);
    await emitProgress('analysing', 50);
    console.log(`[PROCESS] Sending to Google Video Intelligence API...`);

    let status, sensitivityScore, sensitivityDetails;

    try {
      const analysisResult = await analyseWithGoogleVideoIntelligence(video.s3Key);
      status = analysisResult.status;
      sensitivityScore = analysisResult.sensitivityScore;
      sensitivityDetails = analysisResult.sensitivityDetails;
      console.log(`[PROCESS] Analysis complete — Status: ${status} | Score: ${sensitivityScore}`);
      console.log(`[PROCESS] Details:`, sensitivityDetails);
    } catch (apiErr) {
      console.error('[PROCESS] Google Video Intelligence error, falling back to safe:', apiErr.message);
      status = 'safe';
      sensitivityScore = 5;
      sensitivityDetails = { violence: false, adult: false, hate: false };
    }

    await emitProgress('classifying', 80);
    await sleep(500);

    await Video.findByIdAndUpdate(videoId, {
      status,
      sensitivityScore,
      sensitivityDetails,
      processingStage: 'complete',
      processingProgress: 100,
      updatedAt: new Date(),
    });

    if (io) {
      io.emit('processing_complete', {
        videoId: videoId.toString(),
        status,
        sensitivityScore,
        sensitivityDetails,
      });
    }
  } catch (error) {
    console.error('processVideo error:', error);
    await Video.findByIdAndUpdate(videoId, {
      status: 'pending',
      processingStage: 'error',
      updatedAt: new Date(),
    });
  }
};

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const ext = path.extname(req.file.originalname);
    const s3Key = `videos/${uuidv4()}${ext}`;
    const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(1);

    console.log(`\n[UPLOAD] File: "${req.file.originalname}" | Size: ${fileSizeMB}MB | Type: ${req.file.mimetype}`);
    console.log(`[UPLOAD] Uploading to S3: ${s3Key}`);

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    console.log(`[UPLOAD] S3 upload complete`);

    const s3Url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    const title = req.body.title || req.file.originalname;

    const video = await Video.create({
      title,
      filename: s3Key,
      originalName: req.file.originalname,
      filePath: s3Key,
      s3Key,
      s3Url,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id,
      organisation: req.user.organisation || 'default',
    });

    console.log(`[UPLOAD] Video saved to MongoDB: ${video._id} | User: ${req.user.email}`);
    console.log(`[UPLOAD] Queuing analysis...`);

    const io = req.app.get('io');
    processVideo(video._id, io);

    return res.status(201).json({ video });
  } catch (error) {
    console.error('uploadVideo error:', error);
    return res.status(500).json({ message: 'Server error during upload' });
  }
};

const getVideos = async (req, res) => {
  try {
    const filter = { uploadedBy: req.user._id };

    if (req.query.status) {
      const validStatuses = ['pending', 'processing', 'safe', 'flagged'];
      if (validStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }

    const videos = await Video.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ videos });
  } catch (error) {
    console.error('getVideos error:', error);
    return res.status(500).json({ message: 'Server error fetching videos' });
  }
};

const getAllVideosAdmin = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const validStatuses = ['pending', 'processing', 'safe', 'flagged'];
      if (validStatuses.includes(req.query.status)) filter.status = req.query.status;
    }
    if (req.query.userId) filter.uploadedBy = req.query.userId;

    const videos = await Video.find(filter)
      .populate('uploadedBy', 'name email role organisation')
      .sort({ createdAt: -1 });

    return res.status(200).json({ videos });
  } catch (error) {
    console.error('getAllVideosAdmin error:', error);
    return res.status(500).json({ message: 'Server error fetching all videos' });
  }
};

const getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const isOwner = video.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorised to access this video' });
    }

    return res.status(200).json({ video });
  } catch (error) {
    console.error('getVideo error:', error);
    return res.status(500).json({ message: 'Server error fetching video' });
  }
};

const streamVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const isOwner = video.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorised to stream this video' });
    }

    const rangeHeader = req.headers.range;

    const params = {
      Bucket: BUCKET,
      Key: video.s3Key || video.filePath,
    };

    if (rangeHeader) {
      params.Range = rangeHeader;
    }

    const command = new GetObjectCommand(params);
    const s3Response = await s3Client.send(command);

    const contentType = video.mimeType || 'video/mp4';
    const contentLength = s3Response.ContentLength;
    const contentRange = s3Response.ContentRange;

    if (rangeHeader && contentRange) {
      res.writeHead(206, {
        'Content-Range': contentRange,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': contentType,
      });
    } else {
      res.writeHead(200, {
        'Content-Length': contentLength,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
    }

    s3Response.Body.pipe(res);
  } catch (error) {
    console.error('streamVideo error:', error);
    return res.status(500).json({ message: 'Server error streaming video' });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const isOwner = video.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorised to delete this video' });
    }

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: video.s3Key || video.filePath,
    }));

    await Video.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('deleteVideo error:', error);
    return res.status(500).json({ message: 'Server error deleting video' });
  }
};

const getPresignedUrl = async (req, res) => {
  try {
    const { filename, mimeType } = req.query;
    if (!filename || !mimeType) {
      return res.status(400).json({ message: 'filename and mimeType are required' });
    }

    const ext = path.extname(filename);
    const s3Key = `videos/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: mimeType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min

    console.log(`[PRESIGN] Generated presigned URL for: ${filename} → ${s3Key}`);
    return res.status(200).json({ presignedUrl, s3Key });
  } catch (error) {
    console.error('getPresignedUrl error:', error);
    return res.status(500).json({ message: 'Failed to generate upload URL' });
  }
};

const confirmUpload = async (req, res) => {
  try {
    const { s3Key, title, originalName, fileSize, mimeType } = req.body;

    if (!s3Key || !originalName || !fileSize || !mimeType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const s3Url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    const video = await Video.create({
      title: title || originalName.replace(/\.[^/.]+$/, ''),
      filename: s3Key,
      originalName,
      filePath: s3Key,
      s3Key,
      s3Url,
      fileSize,
      mimeType,
      uploadedBy: req.user._id,
      organisation: req.user.organisation || 'default',
    });

    console.log(`[CONFIRM] Video saved to MongoDB: ${video._id} | User: ${req.user.email}`);
    console.log(`[CONFIRM] Queuing analysis for: ${s3Key}`);

    const io = req.app.get('io');
    processVideo(video._id, io);

    return res.status(201).json({ video });
  } catch (error) {
    console.error('confirmUpload error:', error);
    return res.status(500).json({ message: 'Server error confirming upload' });
  }
};

module.exports = { uploadVideo, processVideo, getVideos, getVideo, streamVideo, deleteVideo, getPresignedUrl, confirmUpload, getAllVideosAdmin };
