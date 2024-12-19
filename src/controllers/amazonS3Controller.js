const multer = require("multer");
const AWS = require("aws-sdk");
const path = require("path");
const { console } = require("inspector");


// Initialize S3 with AWS credentials
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// // Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true); // Allow file
    }
    cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
  },
}) // Allow up to 5 files

const isValidImage = (buffer) => {
  // Get the first few bytes of the file to identify its type
  const header = buffer.slice(0, 8); // Read the first 8 bytes

  // Check for JPEG
  const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;

  // Check for PNG
  const isPNG =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4E &&
    header[3] === 0x47 &&
    header[4] === 0x0D &&
    header[5] === 0x0A &&
    header[6] === 0x1A &&
    header[7] === 0x0A;

  // Check for GIF
  const isGIF =
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38;

  return { validate: isJPEG || isPNG || isGIF, type: isJPEG ? 'jpeg' : isPNG ? 'png' : isGIF ? 'gif' : 'unknown' };
};


// Controller to handle single file uploads
const uploadFile = async (req, res) => {
  try {
    const { file, filename, appname } = req.body; // Expecting base64 string in `req.body.file`
    if (!file || !filename || !appname) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Decode the base64 string
    const buffer = Buffer.from(file, 'base64'); // Convert base64 string to buffer

    // Validate file size
    if (buffer.length > 5 * 1024 * 1024) {  // 5 MB limit
      return res.status(400).json({ error: 'File size exceeds the 5MB limit' });
    }

    // Validate file type based on content (no external library)
    const { validate, type } = isValidImage(buffer);
    if (!validate) {
      return res.status(400).json({ error: 'Invalid file format. Only JPEG, PNG, and GIF are allowed.' });
    }

    const newFileName = `user-logos/${appname}/${Date.now()}-${filename}`; // Create a unique file name
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: newFileName,
      Body: buffer,
      ContentType: type,
      ACL: 'public-read'
    };

    // Upload the file to S3
    try {
    const uploadResult = await s3.upload(params).promise();
    const imageUrl = uploadResult.Location; // Get the uploaded file URL
    return res.status(200).json({ imageUrl }); // Respond with the file URL
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: error });

    }
  } catch (err) {
    console.error("Error uploading file:", err.message);
    return res.status(500).json({ error: "Failed to upload image" });
  }
};

// Controller to handle multiple file uploads
const uploadMultipleFiles = async (req, res) => {
  try {
    const uploadedFileUrls = []; // Array to store uploaded file URLs
    const uploadPromises = []; // Array to store upload promises
    // Handle base64 file uploads
    if (req.body.base64Files && req.body.base64Files.length > 0) {
      for (let base64FileData of req.body.base64Files) {
        // Extract base64 data and file name
        const { base64, filename, appname } = base64FileData;
        
        // Remove base64 prefix (data:image/jpeg;base64,)
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
        
        // Convert base64 string to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Validate file type based on content (no external library)
        const { validate, type } = isValidImage(buffer);
        if (!validate) {
          return res.status(400).json({ error: 'Invalid file format. Only JPEG, PNG, and GIF are allowed.' });
        }

        // Use the filename from the frontend
        const fileName = `user-logos/${appname}/${Date.now()}-${filename}`;  // Make file name unique with timestamp
        const params = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileName,
          Body: buffer,
          ContentType: type, // Adjust MIME type if necessary
          ACL: 'public-read'
        };

        uploadPromises.push(params);
      }

      uploadPromises.forEach(async (params) => {
        try {
          // Upload the file to S3
          const uploadResult = await s3.upload(params).promise();
          const imageUrl = uploadResult.Location; // Get the uploaded file URL
          uploadedFileUrls.push(imageUrl);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      });

      // Respond with the URLs of the uploaded files
      return res.status(200).json({ imageUrls: uploadPromises });
    }
    // Respond with the URLs of the uploaded files
    return res.status(400).json( { error: "No files uploaded" });
  } catch (err) {
    console.error("Error uploading files:", err.message);
    return res.status(500).json({ error: "Failed to upload files" });
  }
};

module.exports = {
  uploadFile,             // For single file upload
  uploadMultipleFiles,    // For multiple files upload
  upload
};
