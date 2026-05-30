# HKCS Remaining Features

This file tracks the features from the proposal that are still missing or only partially implemented in the current codebase.

## Already Implemented

- Parent, driver, and admin authentication
- Live GPS bus tracking
- Parent child management
- Driver trip start/end
- Attendance marking
- Admin bus, driver, and route management
- Route stop optimization
- Live ETA to stops
- In-app notifications
- SMS notification scaffolding

## Partially Implemented

- Route optimization: working, but still expandable with stronger traffic-aware logic
- Notifications: in-app and SMS exist, but full push notification flow is not fully completed
- Real-time tracking: works through Socket.IO, but not through the Firebase Realtime Database approach mentioned in the proposal

## Remaining Features

### Payments

- M-Pesa STK Push integration
- Payment callbacks
- Payment history
- Outstanding balance tracking
- Automated fee receipts

### Parent App

- Parent chat with driver/admin
- Change pickup point
- Mark child absent
- Transport history page
- Better payment/fee screens

### Driver App

- Navigation assistance
- Route guidance screen
- Pickup/drop confirmation improvements
- Emergency SOS workflow polishing

### Admin Dashboard

- Parent management module
- Payments module
- Financial reports
- Incident management module
- Analytics charts and graphs
- Better route editing tools

### Super Admin

- School onboarding
- Subscription management
- System-wide analytics
- User role management
- Audit logs

### Smart/Advanced Features

- Geofencing alerts
- Offline support with local caching
- Driver behavior monitoring
- Traffic learning / predictive ETA improvements
- Advanced route recommendations

### Security / Deployment

- API rate limiting
- Audit logging
- Encryption hardening
- Docker containerization
- Cloud deployment
- Full testing suite

## Suggested Next Build Order

1. M-Pesa payments
2. Parent transport history and pickup changes
3. Admin payments dashboard
4. Geofencing and offline support
5. Driver behavior analytics
6. Super admin features

## Notes

- The current implementation is already strong for a student project.
- The biggest proposal gaps are payments, advanced admin tooling, and super admin features.
- Keep this file updated as features are completed.
