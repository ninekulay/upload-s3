const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const config = require('../config/config');
const { exec } = require('child_process');

// Initialize Express application
const app = express();
dotenv.config();

const port = process.env.PORT || 3000; // Define the port number
// Configure bodyParser middleware
app.use(bodyParser.json());

// Configure CORS
const allowedOrigins = ['http://localhost:8080', process.env.SERVICE_BASE_URL];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
const storeFilesRoutes = require('./routes/storeFilesRoutes');

app.use('/api/file-managements', storeFilesRoutes);
app.use(express.json());

// Example route
app.get('/', (req, res) => {
  res.status(403).send('Forbidden');
});

// Endpoint to get system information
const getSystemInfo = () => {
  return new Promise((resolve, reject) => {
    let results = {};
    const commands = {
      cpu: 'top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'',
      ram: 'free -h | awk \'/^Mem/{print $3, $2}\'',
      disk: 'df -h / | awk \'NR==2 {print $3, $4}\'',
    };

    // Create an array of promises for each command
    const commandPromises = Object.keys(commands).map((key) => {
      return new Promise((innerResolve, innerReject) => {
        exec(commands[key], (error, stdout, stderr) => {
          if (error) {
            innerReject(`Error: ${stderr}`);
          } else {
            results[key] = stdout.trim(); // Store result
            innerResolve();
          }
        });
      });
    });

    // Wait for all promises to resolve
    Promise.all(commandPromises)
      .then(() => {
        resolve(results); // Resolve with results when all inner promises complete
      })
      .catch((error) => {
        reject(error); // Reject if any command fails
      });
  });
};

const startServer = async () => {
  try {
    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    const systemInfo = await getSystemInfo();
    console.log('System information:', systemInfo);
  } catch (error) {
    console.error('Error initializing application:', error.message);
    console.error(error);
    process.exit(1);
  }
};

startServer();