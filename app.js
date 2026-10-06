const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

require("dotenv").config();

const leaveRoutes = require("./routes/leaveRoutes");
const authRoutes = require("./routes/authRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();


// Middleware

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// Serve frontend files

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


const PORT =
    process.env.PORT || 5000;


// MongoDB Connection

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {

        console.log(
            "MongoDB Connected Successfully"
        );

    })
    .catch((error) => {

        console.log(
            "MongoDB Connection Error:",
            error.message
        );

    });


// Test API

app.get(
    "/api/test",
    (req, res) => {

        res.json({

            message:
                "Employee Leave Management System Backend is Working"

        });

    }
);


// Authentication Routes

app.use(
    "/api/auth",
    authRoutes
);


// Leave Routes

app.use(
    "/api/leaves",
    leaveRoutes
);


// Leave Balance Routes

app.use(
    "/api/balances",
    balanceRoutes
);


// Administrator Routes

app.use(
    "/api/admin",
    adminRoutes
);


// Report Routes

app.use(
    "/api/reports",
    reportRoutes
);


// Home Page

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


// Start Server

app.listen(
    PORT,
    () => {

        console.log(
            `ELMS Server running on port ${PORT}`
        );

    }
);