const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const LeaveBalance = require("../models/LeaveBalance");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();


// GET ALL EMPLOYEES
router.get(
    "/employees",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {

        try {

            const employees = await User.find()
                .select("-password")
                .sort({
                    createdAt: -1
                });

            res.json({
                message:
                    "Employees fetched successfully",
                employees: employees
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Failed to fetch employees",
                error:
                    error.message
            });

        }

    }
);


// ADD NEW EMPLOYEE
router.post(
    "/employees",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {

        try {

            const {
                employeeId,
                name,
                email,
                password,
                department,
                role,
                managerId
            } = req.body;


            if (
                !employeeId ||
                !name ||
                !email ||
                !password ||
                !department
            ) {

                return res.status(400).json({
                    message:
                        "Please fill all required fields"
                });

            }


            const existingUser =
                await User.findOne({
                    $or: [
                        {
                            employeeId:
                                employeeId
                        },
                        {
                            email:
                                email.toLowerCase()
                        }
                    ]
                });


            if (existingUser) {

                return res.status(400).json({
                    message:
                        "Employee ID or email already exists"
                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const user =
                new User({
                    employeeId:
                        employeeId,

                    name:
                        name,

                    email:
                        email.toLowerCase(),

                    password:
                        hashedPassword,

                    department:
                        department,

                    role:
                        role || "Employee",

                    managerId:
                        managerId || null
                });


            await user.save();


            await LeaveBalance.create({
                employeeId:
                    employeeId
            });


            res.status(201).json({
                message:
                    "Employee added successfully",

                employee: {
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

            res.status(500).json({
                message:
                    "Failed to add employee",

                error:
                    error.message
            });

        }

    }
);


// UPDATE EMPLOYEE
router.put(
    "/employees/:employeeId",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {

        try {

            const employeeId =
                req.params.employeeId;


            const {
                name,
                email,
                department,
                role,
                managerId,
                isActive
            } = req.body;


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


            if (name !== undefined) {
                employee.name =
                    name;
            }


            if (email !== undefined) {

                const existingEmail =
                    await User.findOne({
                        email:
                            email.toLowerCase(),
                        employeeId: {
                            $ne:
                                employeeId
                        }
                    });


                if (existingEmail) {

                    return res.status(400).json({
                        message:
                            "Email already exists"
                    });

                }


                employee.email =
                    email.toLowerCase();

            }


            if (department !== undefined) {

                employee.department =
                    department;

            }


            if (role !== undefined) {

                const allowedRoles = [
                    "Employee",
                    "Manager",
                    "Administrator"
                ];


                if (
                    !allowedRoles.includes(
                        role
                    )
                ) {

                    return res.status(400).json({
                        message:
                            "Invalid role"
                    });

                }


                employee.role =
                    role;

            }


            if (managerId !== undefined) {

                employee.managerId =
                    managerId || null;

            }


            if (isActive !== undefined) {

                employee.isActive =
                    isActive;

            }


            await employee.save();


            res.json({
                message:
                    "Employee updated successfully",

                employee: {
                    employeeId:
                        employee.employeeId,

                    name:
                        employee.name,

                    email:
                        employee.email,

                    department:
                        employee.department,

                    role:
                        employee.role,

                    managerId:
                        employee.managerId,

                    isActive:
                        employee.isActive
                }
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Failed to update employee",

                error:
                    error.message
            });

        }

    }
);


// DEACTIVATE EMPLOYEE
router.put(
    "/employees/:employeeId/deactivate",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {

        try {

            const employeeId =
                req.params.employeeId;


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


            employee.isActive =
                false;


            await employee.save();


            res.json({
                message:
                    "Employee deactivated successfully",

                employee: {
                    employeeId:
                        employee.employeeId,

                    name:
                        employee.name,

                    email:
                        employee.email,

                    department:
                        employee.department,

                    role:
                        employee.role,

                    isActive:
                        employee.isActive
                }
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Failed to deactivate employee",

                error:
                    error.message
            });

        }

    }
);


// DELETE EMPLOYEE
router.delete(
    "/employees/:employeeId",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {

        try {

            const employeeId =
                req.params.employeeId;


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


            await User.deleteOne({
                employeeId:
                    employeeId
            });


            await LeaveBalance.deleteOne({
                employeeId:
                    employeeId
            });


            res.json({
                message:
                    "Employee deleted successfully"
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Failed to delete employee",

                error:
                    error.message
            });

        }

    }
);


module.exports = router;