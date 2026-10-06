const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();


// ============================================================
// PUBLIC REGISTRATION
// ============================================================

router.post("/register", async (req, res) => {

    try {

        const {
            employeeId,
            name,
            email,
            password,
            department
        } = req.body;


        // ----------------------------------------------------
        // Validate required fields
        // ----------------------------------------------------

        if (
            !employeeId ||
            !name ||
            !email ||
            !password ||
            !department
        ) {

            return res.status(400).json({
                message:
                    "Employee ID, name, email, password and department are required"
            });

        }


        // ----------------------------------------------------
        // Check duplicate Employee ID
        // ----------------------------------------------------

        const existingEmployee =
            await User.findOne({
                employeeId: employeeId.trim()
            });


        if (existingEmployee) {

            return res.status(400).json({
                message:
                    "Employee ID already exists"
            });

        }


        // ----------------------------------------------------
        // Check duplicate Email
        // ----------------------------------------------------

        const existingEmail =
            await User.findOne({
                email: email.trim().toLowerCase()
            });


        if (existingEmail) {

            return res.status(400).json({
                message:
                    "Email already exists"
            });

        }


        // ----------------------------------------------------
        // Hash password
        // ----------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // ----------------------------------------------------
        // IMPORTANT SECURITY RULE
        //
        // Public registration ALWAYS creates Employee.
        //
        // The role sent by the browser is intentionally ignored.
        // ----------------------------------------------------

        const user =
            await User.create({

                employeeId:
                    employeeId.trim(),

                name:
                    name.trim(),

                email:
                    email.trim().toLowerCase(),

                password:
                    hashedPassword,

                department:
                    department.trim(),

                role:
                    "Employee",

                managerId:
                    null,

                isActive:
                    true

            });


        // ----------------------------------------------------
        // Response
        // ----------------------------------------------------

        res.status(201).json({

            message:
                "Registration successful. You can now login.",

            user: {

                employeeId:
                    user.employeeId,

                name:
                    user.name,

                email:
                    user.email,

                department:
                    user.department,

                role:
                    user.role

            }

        });


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        res.status(500).json({

            message:
                "Registration failed",

            error:
                error.message

        });

    }

});


// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        // ----------------------------------------------------
        // Validate fields
        // ----------------------------------------------------

        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                message:
                    "Email and password are required"

            });

        }


        // ----------------------------------------------------
        // Find user
        // ----------------------------------------------------

        const user =
            await User.findOne({

                email:
                    email.trim().toLowerCase()

            });


        if (!user) {

            return res.status(401).json({

                message:
                    "Invalid email or password"

            });

        }


        // ----------------------------------------------------
        // Check account status
        // ----------------------------------------------------

        if (!user.isActive) {

            return res.status(403).json({

                message:
                    "Your account has been deactivated. Please contact the administrator."

            });

        }


        // ----------------------------------------------------
        // Compare password
        // ----------------------------------------------------

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                message:
                    "Invalid email or password"

            });

        }


        // ----------------------------------------------------
        // Create JWT token
        // ----------------------------------------------------

        const token =
            jwt.sign(

                {
                    userId:
                        user._id.toString(),

                    employeeId:
                        user.employeeId,

                    name:
                        user.name,

                    email:
                        user.email,

                    department:
                        user.department,

                    role:
                        user.role

                },

                process.env.JWT_SECRET,

                {
                    expiresIn:
                        "2h"
                }

            );


        // ----------------------------------------------------
        // Login response
        // ----------------------------------------------------

        res.json({

            message:
                "Login successful",

            token:

                token,

            user: {

                id:
                    user._id,

                employeeId:
                    user.employeeId,

                name:
                    user.name,

                email:
                    user.email,

                department:
                    user.department,

                role:
                    user.role,

                managerId:
                    user.managerId,

                isActive:
                    user.isActive

            }

        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        res.status(500).json({

            message:
                "Login failed",

            error:
                error.message

        });

    }

});


module.exports = router;