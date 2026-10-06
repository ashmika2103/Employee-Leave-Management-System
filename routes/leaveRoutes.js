const express = require("express");
const mongoose = require("mongoose");

const Leave = require("../models/Leave");
const LeaveBalance = require("../models/LeaveBalance");
const User = require("../models/User");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();


// Leave type to balance field mapping

const leaveTypeFields = {

    "Casual Leave": "casualLeave",

    "Sick Leave": "sickLeave",

    "Earned Leave": "earnedLeave",

    "Emergency Leave": "emergencyLeave"

};


// Calculate number of leave days

function calculateLeaveDays(fromDate, toDate) {

    const start = new Date(fromDate);

    const end = new Date(toDate);


    start.setHours(
        0,
        0,
        0,
        0
    );

    end.setHours(
        0,
        0,
        0,
        0
    );


    const difference =
        end.getTime() -
        start.getTime();


    return Math.floor(
        difference /
        (1000 * 60 * 60 * 24)
    ) + 1;

}



// ======================================================
// APPLY FOR LEAVE
// Employee can apply for leave
// ======================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles(
        "Employee"
    ),
    async (req, res) => {

        try {

            const {
                employeeId,
                employeeName,
                leaveType,
                fromDate,
                toDate,
                reason
            } = req.body;


            // Validate required fields

            if (
                !employeeId ||
                !employeeName ||
                !leaveType ||
                !fromDate ||
                !toDate ||
                !reason
            ) {

                return res.status(400).json({

                    message:
                        "Please fill all required fields"

                });

            }


            // Make sure employee can
            // only apply using their
            // own employee ID

            if (
                req.user.employeeId !==
                employeeId
            ) {

                return res.status(403).json({

                    message:
                        "You can only apply for your own leave"

                });

            }


            // Validate leave type

            if (
                !leaveTypeFields[leaveType]
            ) {

                return res.status(400).json({

                    message:
                        "Invalid leave type"

                });

            }


            // Find employee

            const employee =
                await User.findOne({

                    employeeId:
                        employeeId

                });


            if (!employee) {

                return res.status(404).json({

                    message:
                        "Employee not found"

                });

            }


            // Calculate leave days

            const leaveDays =
                calculateLeaveDays(
                    fromDate,
                    toDate
                );


            if (leaveDays <= 0) {

                return res.status(400).json({

                    message:
                        "To date must be after or equal to from date"

                });

            }


            // Find leave balance

            let balance =
                await LeaveBalance.findOne({

                    employeeId:
                        employeeId

                });


            // Create default balance
            // if it does not exist

            if (!balance) {

                balance =
                    await LeaveBalance.create({

                        employeeId:
                            employeeId

                    });

            }


            const balanceField =
                leaveTypeFields[leaveType];


            const availableBalance =
                balance[balanceField];


            // Prevent insufficient balance

            if (
                availableBalance <
                leaveDays
            ) {

                return res.status(400).json({

                    message:
                        `Insufficient ${leaveType} balance. Available: ${availableBalance} day(s), Required: ${leaveDays} day(s).`

                });

            }


            // Create leave request

            const leave =
                new Leave({

                    employeeId:
                        employeeId,

                    employeeName:
                        employeeName,

                    leaveType:
                        leaveType,

                    fromDate:
                        fromDate,

                    toDate:
                        toDate,

                    reason:
                        reason,

                    status:
                        "Pending"

                });


            const savedLeave =
                await leave.save();


            res.status(201).json({

                message:
                    "Leave applied successfully",

                leave:
                    savedLeave,

                leaveDays:
                    leaveDays

            });


        } catch (error) {

            console.log(
                "Apply Leave Error:",
                error.message
            );


            res.status(500).json({

                message:
                    "Failed to apply leave",

                error:
                    error.message

            });

        }

    }
);



// ======================================================
// GET ALL LEAVE REQUESTS
// Manager and Administrator can view
// ======================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles(
        "Manager",
        "Administrator"
    ),
    async (req, res) => {

        try {

            const leaves =
                await Leave
                    .find()
                    .sort({
                        createdAt: -1
                    });


            res.json(leaves);


        } catch (error) {

            res.status(500).json({

                message:
                    "Failed to fetch leave requests",

                error:
                    error.message

            });

        }

    }
);



// ======================================================
// GET EMPLOYEE'S OWN LEAVE REQUESTS
// ======================================================

router.get(
    "/employee/:employeeId",
    authenticateToken,
    authorizeRoles(
        "Employee"
    ),
    async (req, res) => {

        try {

            const employeeId =
                req.params.employeeId;


            // Employee can only
            // access their own records

            if (
                req.user.employeeId !==
                employeeId
            ) {

                return res.status(403).json({

                    message:
                        "You can only view your own leave requests"

                });

            }


            const leaves =
                await Leave
                    .find({
                        employeeId:
                            employeeId
                    })
                    .sort({
                        createdAt: -1
                    });


            res.json(leaves);


        } catch (error) {

            res.status(500).json({

                message:
                    "Failed to fetch employee leave requests",

                error:
                    error.message

            });

        }

    }
);



// ======================================================
// APPROVE OR REJECT LEAVE
// ONLY MANAGER CAN PERFORM THIS ACTION
// ======================================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles(
        "Manager"
    ),
    async (req, res) => {

        const session =
            await mongoose.startSession();


        try {

            const {
                status
            } = req.body;


            // Validate status

            if (
                status !== "Approved" &&
                status !== "Rejected"
            ) {

                return res.status(400).json({

                    message:
                        "Status must be Approved or Rejected"

                });

            }


            let result;


            // MongoDB transaction

            await session.withTransaction(
                async () => {


                    // Find leave request

                    const leave =
                        await Leave.findById(
                            req.params.id
                        ).session(
                            session
                        );


                    if (!leave) {

                        throw new Error(
                            "Leave request not found"
                        );

                    }


                    // Only pending requests
                    // can be processed

                    if (
                        leave.status !==
                        "Pending"
                    ) {

                        throw new Error(

                            `Leave request is already ${leave.status.toLowerCase()}`

                        );

                    }


                    // Calculate number
                    // of leave days

                    const leaveDays =
                        calculateLeaveDays(
                            leave.fromDate,
                            leave.toDate
                        );


                    // =================================
                    // REJECT LEAVE
                    // =================================

                    if (
                        status ===
                        "Rejected"
                    ) {

                        leave.status =
                            "Rejected";


                        await leave.save({

                            session:
                                session

                        });


                        result = {

                            message:
                                "Leave rejected successfully",

                            leave:
                                leave,

                            leaveDays:
                                leaveDays

                        };


                        return;

                    }


                    // =================================
                    // APPROVE LEAVE
                    // =================================


                    // Find employee balance

                    const balance =
                        await LeaveBalance.findOne({

                            employeeId:
                                leave.employeeId

                        }).session(
                            session
                        );


                    if (!balance) {

                        throw new Error(

                            "Leave balance not found for employee"

                        );

                    }


                    // Get balance field

                    const balanceField =
                        leaveTypeFields[
                            leave.leaveType
                        ];


                    if (!balanceField) {

                        throw new Error(
                            "Invalid leave type"
                        );

                    }


                    const availableBalance =
                        balance[
                            balanceField
                        ];


                    // Check balance again
                    // before approval

                    if (
                        availableBalance <
                        leaveDays
                    ) {

                        throw new Error(

                            `Insufficient ${leave.leaveType} balance. Available: ${availableBalance} day(s), Required: ${leaveDays} day(s).`

                        );

                    }


                    // Deduct leave balance

                    balance[
                        balanceField
                    ] =
                        availableBalance -
                        leaveDays;


                    await balance.save({

                        session:
                            session

                    });


                    // Change status

                    leave.status =
                        "Approved";


                    await leave.save({

                        session:
                            session

                    });


                    result = {

                        message:
                            "Leave approved successfully",

                        leave:
                            leave,

                        leaveDays:
                            leaveDays,

                        remainingBalance:
                            balance[
                                balanceField
                            ]

                    };

                }
            );


            res.json(
                result
            );


        } catch (error) {

            console.log(
                "Leave Approval Error:",
                error.message
            );


            res.status(400).json({

                message:
                    error.message ||
                    "Failed to update leave"

            });


        } finally {

            await session.endSession();

        }

    }
);


module.exports = router;