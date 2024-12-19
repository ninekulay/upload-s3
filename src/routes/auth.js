const jwt = require('jsonwebtoken');

const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const credentialsList = process.env.SERVICE_AUTH_LIST.split(';'); // Assuming credentials are separated by semicolons

    if (!authHeader) {
        return res.status(401).json({ message: 'Authentication failed' }); 
    }

    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    // Check if the provided credentials match any of the valid credentials
    const isValidCredential = credentialsList.some(credential => {
        const [validUsername, validPassword] = credential.split(':');
        return username === validUsername && password === validPassword;
    });
    if (isValidCredential) {
        next(); // Authentication successful, proceed to the next middleware
    } else {
        return res.status(401).json({ message: 'Authentication failed' }); 
    }
};

module.exports = basicAuth
