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

- ✅ Parent chat with driver/admin
- ✅ Change pickup point
- ✅ Mark child absent
- ✅ Transport history page
- ✅ Better payment/fee screens (dedicated payments page with summary, history, M-Pesa integration)

### Driver App

- ✅ Navigation assistance with route guidance screen
- ✅ Route guidance screen with stop-by-stop directions and ETA
- ✅ Pickup/drop confirmation with student details and parent contact
- ✅ Emergency SOS with cancel workflow, history, and bus/trip context

### Admin Dashboard

- ✅ Parent management module (list, search, detail view with children/payments)
- ✅ Payments module (existing enhanced with admin API)
- ✅ Financial reports (period filters, daily breakdown, outstanding debt)
- ✅ Incident management module (SOS alerts, stats, status updates)
- ✅ Analytics charts and graphs (weekly trips, bus utilization, attendance rates, payment trends)
- ✅ Better route editing tools (AI-optimized stop ordering, coordinate validation)

### Smart/Advanced Features

- ✅ Geofencing alerts (virtual zones, enter/exit alerts, school zones, restricted areas)
- ✅ Offline support with local caching (sync queue, pending actions, retry mechanism)
- ✅ Driver behavior monitoring (speeding, harsh braking, acceleration, idle time, route deviations, scoring)
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

1. Parent transport history and pickup changes
2. Admin payments dashboard
3. Geofencing and offline support
4. Driver behavior analytics

## Notes

- The current implementation is already strong for a student project.
- The biggest proposal gaps are payments, advanced admin tooling, and super admin features.
- Keep this file updated as features are completed.
