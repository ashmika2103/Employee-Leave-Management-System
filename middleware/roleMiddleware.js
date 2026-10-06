function authorizeRoles(...allowedRoles) {

    return function (req, res, next) {

        // Check whether user is authenticated
        if (!req.user) {

            return res.status(401).json({
                message: "Authentication required"
            });

        }


        // Check whether user's role
        // is allowed
        if (
            !allowedRoles.includes(
                req.user.role
            )
        ) {

            return res.status(403).json({
                message:
                    "Access denied. You do not have permission to perform this action."
            });

        }


        // User has permission
        next();

    };

}


module.exports = authorizeRoles;