Happy Kids Commuter System — Parent User Manual

Overview

This manual explains how parents use the Happy Kids Commuter System (HKCS) web and mobile apps to view bus locations, manage students, request pickup changes, and make payments.

Getting Started

- Install: Use the Parent mobile app or open the web client.
- Sign in: Use your email or phone and password via the parent login screen.
- First-time: If an account was created for you by the school, request a password reset from the admin if needed.

Main Features

- Dashboard: Shows your children, assigned buses, next trip status, and unread notifications.
- Live Bus Tracking: Real-time bus location on a map. Tap a bus to see estimated arrival and route details.
- Transport History: View historical trips and receipts.
- Attendance/Trip Status: See whether your child boarded or was dropped off for a given trip.
- Notifications: Important alerts from drivers or admins (emergency alerts, delays).
- Payments: Initiate payments via MPESA (or configured gateway) and view receipts.
- Pickup Changes: Request or approve pickup point changes for a scheduled trip.
- Chat: Message school admins about student-specific concerns.

Common Tasks

- Sign In
  1. Open the app or web client.
  2. Navigate to Parent Sign In.
  3. Enter your email or phone and password; tap Sign In.

- View Live Bus
  1. Open the Dashboard and select Map or Live Bus.
  2. Choose your child's assigned bus or route.
  3. The map updates in real time via Socket.IO.

- Request Pickup Change
  1. From the Dashboard select Pickup Change.
  2. Fill form with desired pickup location and date.
  3. Submit; the request is routed to admin for approval.

- Make a Payment (MPESA)
  1. From Dashboard choose Payments.
  2. Select student or subscription and press Pay.
  3. Follow MPESA prompt on your phone and confirm.
  4. A receipt is saved to Transport History.

Troubleshooting

- Login 401 Unauthorized: Ensure you are using the registered email or phone. If you receive 401, confirm account exists and password is correct; contact school admin to reset.
- Map not updating: Check network connectivity and that push notifications/socket connections are allowed. Try reloading the app.
- Payment failure: Confirm MPESA account balance and phone number correctness. Retry or contact support.

Privacy & Security

- Authentication uses JWT tokens. Tokens are stored in app secure storage (AsyncStorage on mobile). Do not share your credentials.
- Sensitive messages (payments, student data) are only accessible to authorized users.

Support

- Contact your school administrator for account setup and student assignments.
- For bugs or technical help, provide app version and describe steps to reproduce.
