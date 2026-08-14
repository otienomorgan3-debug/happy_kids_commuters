Happy Kids Commuter System — Admin User Manual

Overview

This manual explains how school administrators use the Admin Dashboard to create users, manage routes/buses, assign drivers, review pickup change requests, and view reports.

Getting Started

- Access: Admins use the admin-dashboard web app. Login uses admin credentials.
- Privileges: Admins can create `parent`, `driver`, and `admin` users, assign drivers to buses, and reconcile payments.

Main Features

- User Management: Create, edit, and deactivate users. When creating drivers, supply `license_number` and link to a bus.
- Route & Bus Management: Define routes (stops, timings), create buses, and assign drivers to buses.
- Trip Oversight: View active trips, driver locations, and historical trip logs.
- Pickup Change Requests: Approve or reject pickup change requests submitted by parents.
- Payments: View MPESA payment callbacks, reconcile receipts, and refund where necessary.
- Notifications: Send broadcast or targeted notifications to drivers or parents.
- Reports: Export trip logs, attendance records, and route performance data.

Common Tasks

- Create a Driver
  1. Open Users → Create New → select role `driver`.
  2. Enter name, email/phone, license number, assign bus.
  3. Save; the driver receives credentials or admin can set an initial password.

- Assign Route
  1. Open Routes → Create/Modify Route.
  2. Configure stops, timings, and linked bus.
  3. Save and notify assigned drivers.

- Respond to Pickup Change
  1. Open Pickup Change Requests.
  2. Review request, check route impact, and approve or reject.

Troubleshooting

- Users cannot log in: Verify user exists in `users` table and `role` matches intended UI. Ensure the frontend uses email OR phone for login.
- Socket-based location updates missing: Check socket server logs and active rooms; ensure `user:register` was called on login to map sockets.
- Payment reconciliation: Cross-check MPESA callback logs and `payments` table records.

Security & Compliance

- Only admins should be granted `admin` role. Use strong passwords and rotate credentials.
- Keep backups of DB and exported reports. Follow local privacy laws for student data.

Support

- For system-level issues include server logs and timestamps when requesting help from development team.
