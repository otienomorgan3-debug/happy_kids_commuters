# HKCS Database

> PostgreSQL schema and seed data for the Happy Kids Commuter System.

---

## Overview

This directory contains everything needed to set up and populate the HKCS PostgreSQL database. All tables, indexes, constraints, and data migrations are consolidated into a single schema file for simplicity.

---

## Structure

```
database/
├── migrations/
│   └── initial_schema.sql    # Complete database schema (all tables, indexes, fixes)
└── seeds/
    └── initial_test_data.sql # Sample data for testing and development
```

### Migrations

| File | Description |
|------|-------------|
| `migrations/initial_schema.sql` | **Single consolidated schema** — creates all 20+ tables, indexes, constraints, and performs data migrations |

> **Note:**. These have been consolidated into a single `initial_schema.sql`. There is no need to run multiple files — just execute this one.

### Seeds

| File | Description |
|------|-------------|
| `seeds/initial_test_data.sql` | Populates the database with sample users, schools, buses, drivers, students, routes, and payments for development/testing |

---

## Setup

### Prerequisites

- [PostgreSQL](https://www.postgresql.org/) 15+

### Quick Start

```sql
-- 1. Create the database and user
CREATE USER hkcs_user WITH PASSWORD 'hkcs1234';
CREATE DATABASE hkcs_db OWNER hkcs_user;
GRANT ALL PRIVILEGES ON DATABASE hkcs_db TO hkcs_user;
```

```bash
# 2. Run the consolidated schema (all tables + indexes + fixes)
psql -U hkcs_user -d hkcs_db -f migrations/initial_schema.sql

# 3. (Optional) Seed test data
psql -U hkcs_user -d hkcs_db -f seeds/initial_test_data.sql
```

### Using Docker

```bash
# From the project root, start just PostgreSQL
docker compose up -d postgres

# The schema is automatically applied via the docker-entrypoint-initdb.d volume mount
```

---

## Usage

### Run the Schema

```bash
psql -U hkcs_user -d hkcs_db -f migrations/initial_schema.sql
```

### Seed Test Data

```bash
psql -U hkcs_user -d hkcs_db -f seeds/initial_test_data.sql
```

### Verify

```sql
-- List all tables
\dt

-- Check table structure
\d+ users

-- View seed data
SELECT * FROM users;
```

---

## ✨ What's Included

### Tables (21 total)

| Table | Description |
|-------|-------------|
| `users` | All user roles (parent, driver, admin, superadmin) |
| `schools` | Registered schools |
| `parents` | Parent profiles linked to users |
| `buses` | Bus fleet with GPS device IDs |
| `drivers` | Driver profiles linked to users and buses |
| `students` | Students linked to parents and schools |
| `routes` | Bus route definitions |
| `route_stops` | Route stops with coordinates and order |
| `trips` | Trip records with status tracking |
| `attendance` | Student board/drop timestamps |
| `payments` | M-Pesa payment records with full callback data |
| `notifications` | User notification messages |
| `emergency_alerts` | SOS alerts from drivers |
| `chat_messages` | Parent-driver/admin communication |
| `absence_requests` | Student absence notifications |
| `pickup_change_requests` | Pickup location change requests |
| `geofences` | Geofence zones (school zones, restricted areas) |
| `geofence_alerts` | Geofence enter/exit events |
| `driver_behavior_logs` | Speeding, braking, acceleration events |
| `driver_behavior_scores` | Aggregated driver performance scores |
| `offline_sync_queue` | Offline action sync queue |

### Indexes (20 total)

Optimized indexes for payments, chat messages, absence requests, pickup changes, geofence alerts, driver behavior logs, offline sync, users, emergency alerts, and route stops.
