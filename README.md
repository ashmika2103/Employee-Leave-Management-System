# Employee Leave Management System

## Project Name

Employee Leave Management System (ELMS)

## Description

The Employee Leave Management System is a web-based application developed to manage employee leave requests digitally.

The system provides different functionalities for Employees, Managers, and Administrators.

Employees can apply for leave, view their leave balance, and check their leave history.

Managers can view employee leave requests and approve or reject them.

Administrators can manage employees and view monthly and department-wise leave reports.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- Jest

## Main Features

### Employee

- Employee registration and login
- Apply for leave
- Select leave type
- Select leave dates
- Provide leave reason
- View available leave balance
- View leave history
- View leave status

### Manager

- Manager login
- View employee leave requests
- Approve leave requests
- Reject leave requests
- Filter leave requests by status

### Administrator

- Administrator login
- Add employees
- Edit employee details
- Deactivate employees
- Delete employees
- Manage employee roles
- View employee statistics
- Generate monthly leave reports
- Generate department-wise leave reports

## Leave Types

The system supports the following leave types:

- Casual Leave
- Sick Leave
- Earned Leave
- Emergency Leave

## Leave Status

Leave requests can have the following statuses:

- Pending
- Approved
- Rejected

When a leave request is approved, the corresponding leave balance is deducted.

## Project Structure

```text
ELMS
│
├── public/
│   ├── index.html
│   ├── register.html
│   ├── employee-dashboard.html
│   ├── manager-dashboard.html
│   └── admin-dashboard.html
│
├── models/
│   ├── User.js
│   ├── Leave.js
│   └── LeaveBalance.js
│
├── routes/
│   ├── authRoutes.js
│   ├── leaveRoutes.js
│   ├── balanceRoutes.js
│   ├── adminRoutes.js
│   └── reportRoutes.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── tests/
│   └── leaveBalance.test.js
│
├── app.js
├── package.json
├── package-lock.json
├── README.md
└── .gitignore
## Version 2 Update

The Employee Leave Management System was updated as part of the Git version control activity.

This update demonstrates a change made in a cloned repository for Git version control practice.

## Feature Branch Update

Added documentation for the feature branch as part of the Git branching and merging activity.
