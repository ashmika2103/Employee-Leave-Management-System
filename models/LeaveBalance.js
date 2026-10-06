const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            unique: true
        },

        casualLeave: {
            type: Number,
            default: 12,
            min: 0
        },

        sickLeave: {
            type: Number,
            default: 10,
            min: 0
        },

        earnedLeave: {
            type: Number,
            default: 15,
            min: 0
        },

        emergencyLeave: {
            type: Number,
            default: 5,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "LeaveBalance",
    leaveBalanceSchema
);