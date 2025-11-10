const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

// CORS for local development
app.use(cors({
  origin: ['https://australiaimmigration.site', 'http://localhost:3000', 'http://localhost:4000', 'https://admin.australiaimmigration.site', 'http://italyembassy.site'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors());

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// File filter
const fileFilter = (req, file, cb) => {
  console.log('🔍 File filter checking:', {
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ File type allowed');
    cb(null, true);
  } else {
    console.log('❌ File type not allowed:', file.mimetype);
    cb(new Error('Invalid file type. Only JPG, PNG, PDF, DOC, and DOCX files are allowed.'), false);
  }
};

// Use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Function to get base URL based on environment
const getBaseUrl = () => {
  // Check if we're in production (your domain)
  if (process.env.NODE_ENV === 'production' || 
      process.env.HOSTNAME === 'admin.australiaimmigration.site' ||
      __dirname.includes('admin.australiaimmigration.site')) {
    return 'https://admin.australiaimmigration.site';
  }
  // For local development
  return `http://localhost:${PORT}`;
};

// Upload endpoint for application letters
app.post('/upload-application-letter', upload.single('file'), async (req, res) => {
  console.log('🚀 UPLOAD ENDPOINT HIT');
  console.log('📦 Request body:', req.body);
  console.log('📄 Request file exists:', !!req.file);
  
  if (req.file) {
    console.log('📄 File details:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      bufferLength: req.file.buffer.length
    });
  }

  try {
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded. Please select a file.' 
      });
    }

    const { userId, applicationId } = req.body;
    
    console.log('🔍 Extracted from body:', { userId, applicationId });
    
    if (!userId || !applicationId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'User ID and Application ID are required'
      });
    }

    // Create user directory
    const userDir = path.join(__dirname, 'uploads', userId);
    if (!fs.existsSync(userDir)) {
      console.log('📁 Creating user directory:', userDir);
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(req.file.originalname);
    const fileName = 'application-letter-' + uniqueSuffix + fileExtension;
    const filePath = path.join(userDir, fileName);

    // Save file from memory buffer to disk
    console.log('💾 Saving file to:', filePath);
    fs.writeFileSync(filePath, req.file.buffer);

    // ✅ FIXED: Use production domain URL instead of localhost
    const baseUrl = getBaseUrl();
    const fileUrl = `${baseUrl}/uploads/${userId}/${fileName}`;
    const serverFilePath = `uploads/${userId}/${fileName}`;

    console.log('✅ File upload completed successfully:', {
      applicationId: applicationId,
      userId: userId,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileUrl: fileUrl,
      baseUrl: baseUrl
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileInfo: {
        applicationLetter: fileUrl, // This will now be your production URL
        applicationLetterName: req.file.originalname,
        applicationLetterType: req.file.mimetype,
        applicationLetterSize: req.file.size,
        applicationLetterPath: serverFilePath,
        applicationLetterUploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Upload endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed: ' + error.message
    });
  }
});

// Manual upload endpoint for biometric documents
app.post('/upload-manual', upload.single('file'), async (req, res) => {
  console.log('🚀 MANUAL UPLOAD ENDPOINT HIT');
  console.log('📦 Request query parameters:', req.query);
  console.log('📄 Request file exists:', !!req.file);
  
  if (req.file) {
    console.log('📄 File details:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      bufferLength: req.file.buffer?.length || 0
    });
  }

  try {
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded. Please select a file.' 
      });
    }

    // Get parameters from query string
    const { userId, applicationId, fileType } = req.query;
    
    console.log('🔍 Extracted from query:', { userId, applicationId, fileType });
    
    if (!userId) {
      console.log('❌ Missing required field: userId');
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Create user directory
    const userDir = path.join(__dirname, 'uploads', userId);
    if (!fs.existsSync(userDir)) {
      console.log('📁 Creating user directory:', userDir);
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Generate unique filename based on file type
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(req.file.originalname);
    
    // Determine filename based on fileType parameter
    let fileName;
    if (fileType) {
      fileName = `${fileType}-${uniqueSuffix}${fileExtension}`;
    } else {
      fileName = `document-${uniqueSuffix}${fileExtension}`;
    }
    
    const filePath = path.join(userDir, fileName);

    // Save file from memory buffer to disk
    console.log('💾 Saving file to:', filePath);
    fs.writeFileSync(filePath, req.file.buffer);

    // ✅ FIXED: Use production domain URL instead of localhost
    const baseUrl = getBaseUrl();
    const fileUrl = `/uploads/${userId}/${fileName}`;
    const fullUrl = `${baseUrl}${fileUrl}`;
    const serverFilePath = `uploads/${userId}/${fileName}`;

    console.log('✅ Manual file upload completed successfully:', {
      userId: userId,
      applicationId: applicationId,
      fileType: fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileUrl: fileUrl,
      fullUrl: fullUrl,
      baseUrl: baseUrl
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      fileInfo: {
        fileUrl: fileUrl,
        fullUrl: fullUrl, // This will now be your production URL
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: serverFilePath,
        uploadedAt: new Date().toISOString(),
        documentType: fileType
      }
    });

  } catch (error) {
    console.error('❌ Manual upload endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed: ' + error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  const baseUrl = getBaseUrl();
  res.json({ 
    status: 'OK', 
    message: `File upload server is running on ${baseUrl}/`,
    baseUrl: baseUrl,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.post('/test-upload', upload.single('file'), (req, res) => {
  const baseUrl = getBaseUrl();
  console.log('🧪 TEST ENDPOINT HIT - Base URL:', baseUrl);
  res.json({
    success: true,
    message: `Test endpoint working on ${baseUrl}/`,
    baseUrl: baseUrl,
    receivedBody: req.body,
    receivedFile: req.file ? 'File received' : 'No file'
  });
});

// Delete file endpoint
app.post('/delete-file', async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    // Construct full file path
    const fullFilePath = path.join(__dirname, filePath);

    console.log('🗑️ Attempting to delete file:', fullFilePath);

    // Check if file exists and delete it
    if (fs.existsSync(fullFilePath)) {
      fs.unlinkSync(fullFilePath);
      console.log('✅ File deleted from server:', fullFilePath);
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      console.log('⚠️ File not found on server:', fullFilePath);
      res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'File deletion failed: ' + error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  const baseUrl = getBaseUrl();
  console.log(`🚀 File upload server running on ${baseUrl}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST ${baseUrl}/upload-application-letter`);
  console.log(`   POST ${baseUrl}/upload-manual`);
  console.log(`   POST ${baseUrl}/test-upload`);
  console.log(`   GET  ${baseUrl}/health`);
  console.log(`✅ Server ready!`);
});