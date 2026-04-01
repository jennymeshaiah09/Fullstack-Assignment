const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
  },
  originalName: {
    type: String,
    required: [true, 'Original name is required'],
  },
  filePath: {
    type: String,
    required: [true, 'File path is required'],
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
  },
  duration: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'safe', 'flagged'],
    default: 'pending',
  },
  sensitivityScore: {
    type: Number,
    default: 0,
  },
  sensitivityDetails: {
    violence: { type: Boolean, default: false },
    adult: { type: Boolean, default: false },
    hate: { type: Boolean, default: false },
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organisation: {
    type: String,
    default: 'default',
  },
  s3Key: {
    type: String,
  },
  s3Url: {
    type: String,
  },
  thumbnailUrl: {
    type: String,
  },
  processingProgress: {
    type: Number,
    default: 0,
  },
  processingStage: {
    type: String,
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Video', videoSchema);
