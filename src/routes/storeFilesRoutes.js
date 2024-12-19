const express = require('express');
const router = express.Router();
const amazonS3Controller = require('../controllers/amazonS3Controller');

const basicAuth = require('./auth');

// Route for single file upload
router.post("/upload", basicAuth, amazonS3Controller.upload.single('file'), amazonS3Controller.uploadFile);
router.post("/upload-multiple" , basicAuth, amazonS3Controller.upload.array('files', 5), amazonS3Controller.uploadMultipleFiles); // Max 5 files


module.exports = router;
