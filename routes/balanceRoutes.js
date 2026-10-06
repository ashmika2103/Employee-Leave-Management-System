const express = require("express");

const LeaveBalance = require("../models/LeaveBalance");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();


// GET LEAVE BALANCE - Employee can view only their own balance
router.get(
    "/:employeeId",
    authenticateToken,
    authorizeRoles("Employee"),
    async (req, res) => {

        try {

            const employeeId =
                req.params.employeeId;

            if (
                req.user.employeeId !==
                employeeId
            ) {
                return res.status(403).json({
                    message:
                        "You can only view your own leave balance"
                });
            }

            let balance =
                await LeaveBalance.findOne({
                    employeeId: employeeId
                });

            if (!balance) {

                balance =
                    await LeaveBalance.create({
                        employeeId: employeeId
                    });

            }

            res.json({
                message:
                    "Leave balance fetched successfully",
                balance: balance
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Failed to fetch leave balance",
                error:
                    error.message
            });

        }

    }
);


// CREATE LEAVE BALANCE
router.post(
    "/",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {

        try {

            const {
                employeeId
            } = req.body;

            if (!employeeId) {

                return res.status(400).json({
                    message:
                        "Employee ID is required"
                });

            }

            const existingBalance =
                await LeaveBalance.findOne({
                    employeeId: employeeId
                });

            if (existingBalance) {

                return res.status(400).json({
                    message:
                        "Leave balance already exists"
                });

            }

            const balance =
                await LeaveBalance.create({
                    employeeId: employeeId
                });

            res.status(201).json({
                message:
                    "Leave balance created successfully",
                balance: balance
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Failed to create leave balance",
                error:
                    error.message
            });

        }

    }
);


module.exports = router;