const jwt = require("jsonwebtoken");


// Authentication middleware
function authenticateToken(req, res, next) {

    try {

        // Get Authorization header
        const authHeader =
            req.headers.authorization;


        // Check whether token exists
        if (!authHeader) {

            return res.status(401).json({
                message: "Access denied. Login required."
            });

        }


        // Expected format:
        // Bearer TOKEN
        const parts =
            authHeader.split(" ");


        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer"
        ) {

            return res.status(401).json({
                message: "Invalid authorization format"
            });

        }


        const token =
            parts[1];


        // Verify JWT token
        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // Store user information
        // inside request
        req.user = decoded;


        // Continue to next middleware
        next();


    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }

}


module.exports = authenticateToken;