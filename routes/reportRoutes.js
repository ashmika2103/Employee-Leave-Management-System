const express = require("express");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const User = require("../models/User");
const Leave = require("../models/Leave");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

const leaveTypes = [
    "Casual Leave",
    "Sick Leave",
    "Earned Leave",
    "Emergency Leave"
];

function calculateLeaveDays(fromDate, toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);

    const difference =
        end.getTime() - start.getTime();

    return (
        Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        ) + 1
    );
}

function getMonthDateRange(month, year) {
    const startDate = new Date(
        year,
        month - 1,
        1
    );

    const endDate = new Date(
        year,
        month,
        0,
        23,
        59,
        59,
        999
    );

    return {
        startDate,
        endDate
    };
}

function calculateOverlappingLeaveDays(
    fromDate,
    toDate,
    rangeStart,
    rangeEnd
) {
    const leaveStart = new Date(fromDate);
    const leaveEnd = new Date(toDate);

    const actualStart =
        leaveStart > rangeStart
            ? leaveStart
            : rangeStart;

    const actualEnd =
        leaveEnd < rangeEnd
            ? leaveEnd
            : rangeEnd;

    if (actualStart > actualEnd) {
        return 0;
    }

    return calculateLeaveDays(
        actualStart,
        actualEnd
    );
}

/* =====================================================
   MONTHLY REPORT
   GET /api/reports/monthly?month=10&year=2026
===================================================== */

router.get(
    "/monthly",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const month = Number(req.query.month);
            const year = Number(req.query.year);

            if (
                !month ||
                !year ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    message:
                        "Valid month and year are required"
                });
            }

            const {
                startDate,
                endDate
            } = getMonthDateRange(
                month,
                year
            );

            const leaves = await Leave.find({
                fromDate: {
                    $lte: endDate
                },
                toDate: {
                    $gte: startDate
                }
            }).sort({
                fromDate: 1
            });

            let totalLeaveDays = 0;

            const records = leaves.map(
                (leave) => {
                    const leaveDays =
                        calculateOverlappingLeaveDays(
                            leave.fromDate,
                            leave.toDate,
                            startDate,
                            endDate
                        );

                    totalLeaveDays += leaveDays;

                    return {
                        employeeId:
                            leave.employeeId,
                        employeeName:
                            leave.employeeName,
                        leaveType:
                            leave.leaveType,
                        fromDate:
                            leave.fromDate,
                        toDate:
                            leave.toDate,
                        leaveDays:
                            leaveDays,
                        reason:
                            leave.reason,
                        status:
                            leave.status
                    };
                }
            );

            const summary = {
                totalRequests:
                    records.length,

                approved:
                    records.filter(
                        (item) =>
                            item.status ===
                            "Approved"
                    ).length,

                rejected:
                    records.filter(
                        (item) =>
                            item.status ===
                            "Rejected"
                    ).length,

                pending:
                    records.filter(
                        (item) =>
                            item.status ===
                            "Pending"
                    ).length,

                totalLeaveDays:
                    totalLeaveDays
            };

            res.json({
                message:
                    "Monthly report generated successfully",

                month,
                year,

                summary,

                records
            });

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate monthly report",
                error: error.message
            });
        }
    }
);

/* =====================================================
   DEPARTMENT REPORT
   GET /api/reports/department?department=CSE
===================================================== */

router.get(
    "/department",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const department =
                req.query.department;

            if (!department) {
                return res.status(400).json({
                    message:
                        "Department is required"
                });
            }

            const employees =
                await User.find({
                    department: department
                }).select(
                    "employeeId name email department role"
                );

            const employeeIds =
                employees.map(
                    (employee) =>
                        employee.employeeId
                );

            const leaves =
                await Leave.find({
                    employeeId: {
                        $in: employeeIds
                    }
                }).sort({
                    fromDate: 1
                });

            let totalLeaveDays = 0;

            const records = leaves.map(
                (leave) => {
                    const leaveDays =
                        calculateLeaveDays(
                            leave.fromDate,
                            leave.toDate
                        );

                    totalLeaveDays += leaveDays;

                    return {
                        employeeId:
                            leave.employeeId,
                        employeeName:
                            leave.employeeName,
                        leaveType:
                            leave.leaveType,
                        fromDate:
                            leave.fromDate,
                        toDate:
                            leave.toDate,
                        leaveDays:
                            leaveDays,
                        reason:
                            leave.reason,
                        status:
                            leave.status
                    };
                }
            );

            const summary = {
                totalEmployees:
                    employees.length,

                totalRequests:
                    records.length,

                approved:
                    records.filter(
                        (item) =>
                            item.status ===
                            "Approved"
                    ).length,

                rejected:
                    records.filter(
                        (item) =>
                            item.status ===
                            "Rejected"
                    ).length,

                pending:
                    records.filter(
                        (item) =>
                            item.status ===
                            "Pending"
                    ).length,

                totalLeaveDays:
                    totalLeaveDays
            };

            res.json({
                message:
                    "Department report generated successfully",

                department,

                summary,

                records
            });

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate department report",
                error: error.message
            });
        }
    }
);

/* =====================================================
   DEPARTMENT SUMMARY
   GET /api/reports/department-summary
===================================================== */

router.get(
    "/department-summary",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const employees =
                await User.find({
                    role: {
                        $ne: "Administrator"
                    }
                }).select(
                    "employeeId department"
                );

            const departments = {};

            employees.forEach(
                (employee) => {
                    if (
                        !departments[
                            employee.department
                        ]
                    ) {
                        departments[
                            employee.department
                        ] = {
                            department:
                                employee.department,
                            totalEmployees: 0,
                            totalRequests: 0,
                            approved: 0,
                            rejected: 0,
                            pending: 0,
                            totalLeaveDays: 0
                        };
                    }

                    departments[
                        employee.department
                    ].totalEmployees++;
                }
            );

            const employeeIds =
                employees.map(
                    (employee) =>
                        employee.employeeId
                );

            const leaves =
                await Leave.find({
                    employeeId: {
                        $in: employeeIds
                    }
                });

            leaves.forEach((leave) => {
                const employee =
                    employees.find(
                        (item) =>
                            item.employeeId ===
                            leave.employeeId
                    );

                if (!employee) {
                    return;
                }

                const department =
                    employee.department;

                if (
                    !departments[
                        department
                    ]
                ) {
                    return;
                }

                departments[
                    department
                ].totalRequests++;

                if (
                    leave.status ===
                    "Approved"
                ) {
                    departments[
                        department
                    ].approved++;
                }

                if (
                    leave.status ===
                    "Rejected"
                ) {
                    departments[
                        department
                    ].rejected++;
                }

                if (
                    leave.status ===
                    "Pending"
                ) {
                    departments[
                        department
                    ].pending++;
                }

                departments[
                    department
                ].totalLeaveDays +=
                    calculateLeaveDays(
                        leave.fromDate,
                        leave.toDate
                    );
            });

            res.json({
                message:
                    "Department summary generated successfully",

                departments:
                    Object.values(
                        departments
                    )
            });

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate department summary",
                error: error.message
            });
        }
    }
);

/* =====================================================
   MONTHLY PDF REPORT
   GET /api/reports/monthly/pdf?month=10&year=2026
===================================================== */

router.get(
    "/monthly/pdf",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const month = Number(req.query.month);
            const year = Number(req.query.year);

            if (
                !month ||
                !year ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    message:
                        "Valid month and year are required"
                });
            }

            const {
                startDate,
                endDate
            } = getMonthDateRange(
                month,
                year
            );

            const leaves = await Leave.find({
                fromDate: {
                    $lte: endDate
                },
                toDate: {
                    $gte: startDate
                }
            }).sort({
                fromDate: 1
            });

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename=monthly-report-${month}-${year}.pdf`
            );

            const doc =
                new PDFDocument({
                    margin: 40
                });

            doc.pipe(res);

            doc.fontSize(18).text(
                "Employee Leave Management System",
                {
                    align: "center"
                }
            );

            doc.moveDown();

            doc.fontSize(14).text(
                `Monthly Leave Report - ${month}/${year}`,
                {
                    align: "center"
                }
            );

            doc.moveDown();

            let approved = 0;
            let rejected = 0;
            let pending = 0;
            let totalDays = 0;

            leaves.forEach((leave) => {
                const days =
                    calculateOverlappingLeaveDays(
                        leave.fromDate,
                        leave.toDate,
                        startDate,
                        endDate
                    );

                totalDays += days;

                if (
                    leave.status ===
                    "Approved"
                ) {
                    approved++;
                }

                if (
                    leave.status ===
                    "Rejected"
                ) {
                    rejected++;
                }

                if (
                    leave.status ===
                    "Pending"
                ) {
                    pending++;
                }
            });

            doc.fontSize(11);

            doc.text(
                `Total Requests: ${leaves.length}`
            );

            doc.text(
                `Approved: ${approved}`
            );

            doc.text(
                `Rejected: ${rejected}`
            );

            doc.text(
                `Pending: ${pending}`
            );

            doc.text(
                `Total Leave Days: ${totalDays}`
            );

            doc.moveDown();

            doc.fontSize(12).text(
                "Leave Details"
            );

            doc.moveDown();

            leaves.forEach((leave, index) => {
                const days =
                    calculateOverlappingLeaveDays(
                        leave.fromDate,
                        leave.toDate,
                        startDate,
                        endDate
                    );

                doc.fontSize(9).text(
                    `${index + 1}. ${leave.employeeId} - ${leave.employeeName}`
                );

                doc.text(
                    `Type: ${leave.leaveType} | Days: ${days} | Status: ${leave.status}`
                );

                doc.text(
                    `From: ${new Date(
                        leave.fromDate
                    ).toLocaleDateString()} | To: ${new Date(
                        leave.toDate
                    ).toLocaleDateString()}`
                );

                doc.text(
                    `Reason: ${leave.reason}`
                );

                doc.moveDown();

                if (
                    doc.y >
                    720
                ) {
                    doc.addPage();
                }
            });

            doc.end();

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate monthly PDF",
                error: error.message
            });
        }
    }
);

/* =====================================================
   MONTHLY EXCEL REPORT
   GET /api/reports/monthly/excel?month=10&year=2026
===================================================== */

router.get(
    "/monthly/excel",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const month = Number(req.query.month);
            const year = Number(req.query.year);

            if (
                !month ||
                !year ||
                month < 1 ||
                month > 12
            ) {
                return res.status(400).json({
                    message:
                        "Valid month and year are required"
                });
            }

            const {
                startDate,
                endDate
            } = getMonthDateRange(
                month,
                year
            );

            const leaves = await Leave.find({
                fromDate: {
                    $lte: endDate
                },
                toDate: {
                    $gte: startDate
                }
            }).sort({
                fromDate: 1
            });

            const workbook =
                new ExcelJS.Workbook();

            const worksheet =
                workbook.addWorksheet(
                    "Monthly Report"
                );

            worksheet.columns = [
                {
                    header: "Employee ID",
                    key: "employeeId",
                    width: 15
                },
                {
                    header: "Employee Name",
                    key: "employeeName",
                    width: 25
                },
                {
                    header: "Leave Type",
                    key: "leaveType",
                    width: 20
                },
                {
                    header: "From Date",
                    key: "fromDate",
                    width: 15
                },
                {
                    header: "To Date",
                    key: "toDate",
                    width: 15
                },
                {
                    header: "Leave Days",
                    key: "leaveDays",
                    width: 12
                },
                {
                    header: "Reason",
                    key: "reason",
                    width: 35
                },
                {
                    header: "Status",
                    key: "status",
                    width: 15
                }
            ];

            leaves.forEach((leave) => {
                worksheet.addRow({
                    employeeId:
                        leave.employeeId,

                    employeeName:
                        leave.employeeName,

                    leaveType:
                        leave.leaveType,

                    fromDate:
                        new Date(
                            leave.fromDate
                        ).toLocaleDateString(),

                    toDate:
                        new Date(
                            leave.toDate
                        ).toLocaleDateString(),

                    leaveDays:
                        calculateOverlappingLeaveDays(
                            leave.fromDate,
                            leave.toDate,
                            startDate,
                            endDate
                        ),

                    reason:
                        leave.reason,

                    status:
                        leave.status
                });
            });

            worksheet.getRow(1).font = {
                bold: true
            };

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename=monthly-report-${month}-${year}.xlsx`
            );

            await workbook.xlsx.write(res);

            res.end();

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate monthly Excel report",
                error: error.message
            });
        }
    }
);

/* =====================================================
   DEPARTMENT PDF REPORT
   GET /api/reports/department/pdf?department=CSE
===================================================== */

router.get(
    "/department/pdf",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const department =
                req.query.department;

            if (!department) {
                return res.status(400).json({
                    message:
                        "Department is required"
                });
            }

            const employees =
                await User.find({
                    department: department
                }).select(
                    "employeeId name"
                );

            const employeeIds =
                employees.map(
                    (employee) =>
                        employee.employeeId
                );

            const leaves =
                await Leave.find({
                    employeeId: {
                        $in: employeeIds
                    }
                }).sort({
                    fromDate: 1
                });

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${department}-leave-report.pdf`
            );

            const doc =
                new PDFDocument({
                    margin: 40
                });

            doc.pipe(res);

            doc.fontSize(18).text(
                "Employee Leave Management System",
                {
                    align: "center"
                }
            );

            doc.moveDown();

            doc.fontSize(14).text(
                `Department Leave Report - ${department}`,
                {
                    align: "center"
                }
            );

            doc.moveDown();

            let approved = 0;
            let rejected = 0;
            let pending = 0;
            let totalDays = 0;

            leaves.forEach((leave) => {
                const days =
                    calculateLeaveDays(
                        leave.fromDate,
                        leave.toDate
                    );

                totalDays += days;

                if (
                    leave.status ===
                    "Approved"
                ) {
                    approved++;
                }

                if (
                    leave.status ===
                    "Rejected"
                ) {
                    rejected++;
                }

                if (
                    leave.status ===
                    "Pending"
                ) {
                    pending++;
                }
            });

            doc.fontSize(11);

            doc.text(
                `Total Employees: ${employees.length}`
            );

            doc.text(
                `Total Requests: ${leaves.length}`
            );

            doc.text(
                `Approved: ${approved}`
            );

            doc.text(
                `Rejected: ${rejected}`
            );

            doc.text(
                `Pending: ${pending}`
            );

            doc.text(
                `Total Leave Days: ${totalDays}`
            );

            doc.moveDown();

            doc.fontSize(12).text(
                "Leave Details"
            );

            doc.moveDown();

            leaves.forEach((leave, index) => {
                const days =
                    calculateLeaveDays(
                        leave.fromDate,
                        leave.toDate
                    );

                doc.fontSize(9).text(
                    `${index + 1}. ${leave.employeeId} - ${leave.employeeName}`
                );

                doc.text(
                    `Type: ${leave.leaveType} | Days: ${days} | Status: ${leave.status}`
                );

                doc.text(
                    `From: ${new Date(
                        leave.fromDate
                    ).toLocaleDateString()} | To: ${new Date(
                        leave.toDate
                    ).toLocaleDateString()}`
                );

                doc.text(
                    `Reason: ${leave.reason}`
                );

                doc.moveDown();

                if (
                    doc.y >
                    720
                ) {
                    doc.addPage();
                }
            });

            doc.end();

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate department PDF",
                error: error.message
            });
        }
    }
);

/* =====================================================
   DEPARTMENT EXCEL REPORT
   GET /api/reports/department/excel?department=CSE
===================================================== */

router.get(
    "/department/excel",
    authenticateToken,
    authorizeRoles("Administrator"),
    async (req, res) => {
        try {
            const department =
                req.query.department;

            if (!department) {
                return res.status(400).json({
                    message:
                        "Department is required"
                });
            }

            const employees =
                await User.find({
                    department: department
                }).select(
                    "employeeId name"
                );

            const employeeIds =
                employees.map(
                    (employee) =>
                        employee.employeeId
                );

            const leaves =
                await Leave.find({
                    employeeId: {
                        $in: employeeIds
                    }
                }).sort({
                    fromDate: 1
                });

            const workbook =
                new ExcelJS.Workbook();

            const worksheet =
                workbook.addWorksheet(
                    "Department Report"
                );

            worksheet.columns = [
                {
                    header: "Employee ID",
                    key: "employeeId",
                    width: 15
                },
                {
                    header: "Employee Name",
                    key: "employeeName",
                    width: 25
                },
                {
                    header: "Leave Type",
                    key: "leaveType",
                    width: 20
                },
                {
                    header: "From Date",
                    key: "fromDate",
                    width: 15
                },
                {
                    header: "To Date",
                    key: "toDate",
                    width: 15
                },
                {
                    header: "Leave Days",
                    key: "leaveDays",
                    width: 12
                },
                {
                    header: "Reason",
                    key: "reason",
                    width: 35
                },
                {
                    header: "Status",
                    key: "status",
                    width: 15
                }
            ];

            leaves.forEach((leave) => {
                worksheet.addRow({
                    employeeId:
                        leave.employeeId,

                    employeeName:
                        leave.employeeName,

                    leaveType:
                        leave.leaveType,

                    fromDate:
                        new Date(
                            leave.fromDate
                        ).toLocaleDateString(),

                    toDate:
                        new Date(
                            leave.toDate
                        ).toLocaleDateString(),

                    leaveDays:
                        calculateLeaveDays(
                            leave.fromDate,
                            leave.toDate
                        ),

                    reason:
                        leave.reason,

                    status:
                        leave.status
                });
            });

            worksheet.getRow(1).font = {
                bold: true
            };

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${department}-leave-report.xlsx`
            );

            await workbook.xlsx.write(res);

            res.end();

        } catch (error) {
            res.status(500).json({
                message:
                    "Failed to generate department Excel report",
                error: error.message
            });
        }
    }
);

module.exports = router;