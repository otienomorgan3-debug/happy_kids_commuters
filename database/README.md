# HKCS - Database Schema & Migrations

This directory contains the SQL migration files and seed data required to set up the PostgreSQL database for the Happy Kids Commuter System (HKCS).

## Structure
- `migrations/`: Contains `.sql` files that define the database schema (tables, views, roles). The main file is typically `001_initial_schema.sql`.
- `seeds/`: Contains SQL scripts to populate the database with initial dummy data for testing and development.

## Setup Instructions

1. Connect to your PostgreSQL instance using `psql`, pgAdmin, or your preferred client.
2. Ensure you have created the required user and database. You can run the following in pgAdmin:
   ```sql
   CREATE USER hkcs_user WITH PASSWORD 'hkcs1234';
   CREATE DATABASE hkcs_db OWNER hkcs_user;
   GRANT ALL PRIVILEGES ON DATABASE hkcs_db TO hkcs_user;
   ```
3. Execute the initial schema script:
   ```bash
   psql -U hkcs_user -d hkcs_db -f migrations/001_initial_schema.sql
   ```
