const express = require('express');
const router = express.Router();
const {
  uploadVideo,
  getVideos,
  getVideo,
  streamVideo,
  deleteVideo,
  getPresignedUrl,
  confirmUpload,
  getAllVideosAdmin,
} = require('../controllers/videoController');
const { protect, authorise } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.get('/admin/all', protect, authorise('admin'), getAllVideosAdmin);
router.get('/presigned-url', protect, getPresignedUrl);
router.post('/confirm-upload', protect, confirmUpload);
router.post('/upload', protect, upload.single('video'), uploadVideo);
router.get('/', protect, getVideos);
router.get('/:id', protect, getVideo);
router.get('/:id/stream', protect, streamVideo);
router.delete('/:id', protect, deleteVideo);

module.exports = router;
