#!/bin/bash

# HKCS Demo Script
# This script sets up and demonstrates the Happy Kids Commuter System

set -e

echo "=========================================="
echo "HKCS Demo Setup and Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo -e "${BLUE}Step 1: Starting services with Docker Compose...${NC}"
docker-compose up -d

echo ""
echo -e "${BLUE}Step 2: Waiting for services to be ready...${NC}"
sleep 10

# Check if backend is running
echo "Checking backend health..."
max_retries=30
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:5000/ > /dev/null; then
        echo -e "${GREEN}✓ Backend is running${NC}"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "Waiting for backend... ($retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "Error: Backend failed to start"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Seeding database with sample data...${NC}"

# Wait for PostgreSQL to be ready
sleep 5

# Run seed SQL file
echo "Loading seed data..."
docker exec -i hkcs_postgres psql -U hkcs_user -d hkcs_db < database/seeds/001_initial_data.sql

echo -e "${GREEN}✓ Database seeded successfully${NC}"

echo ""
echo -e "${BLUE}Step 4: Testing API endpoints...${NC}"

# Test health endpoint
echo "Testing health endpoint..."
response=$(curl -s -w "\n%{http_code}" http://localhost:5000/)
http_code=$(echo "$response" | tail -n 1)
if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo "✗ Health check failed (HTTP $http_code)"
fi

# Test user registration
echo ""
echo "Testing user registration..."
register_response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo User",
    "email": "demo@example.com",
    "phone": "+254700000099",
    "password": "demo123",
    "role": "parent"
  }')
http_code=$(echo "$register_response" | tail -n 1)
body=$(echo "$register_response" | head -n -1)

if [ "$http_code" == "201" ]; then
    echo -e "${GREEN}✓ User registration successful${NC}"
    echo "Response: $body"
    # Extract token for subsequent requests
    TOKEN=$(echo $body | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo "✗ User registration failed (HTTP $http_code)"
    echo "Response: $body"
fi

# Test login
echo ""
echo "Testing user login..."
login_response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hkcs.com",
    "password": "password123"
  }')
http_code=$(echo "$login_response" | tail -n 1)
body=$(echo "$login_response" | head -n -1)

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓ User login successful${NC}"
    echo "Response: $body"
else
    echo "✗ User login failed (HTTP $http_code)"
    echo "Response: $body"
fi

# Test getting routes (requires auth)
echo ""
echo "Testing protected route (get routes)..."
routes_response=$(curl -s -w "\n%{http_code}" -X GET http://localhost:5000/api/routes \
  -H "Authorization: Bearer $TOKEN")
http_code=$(echo "$routes_response" | tail -n 1)
body=$(echo "$routes_response" | head -n -1)

if [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓ Protected route access successful${NC}"
    echo "Response: $body"
else
    echo "✗ Protected route access failed (HTTP $http_code)"
    echo "Response: $body"
fi

echo ""
echo -e "${BLUE}Step 5: Displaying service URLs...${NC}"
echo ""
echo "Services running:"
echo "  - Backend API:     http://localhost:5000"
echo "  - AI Service:      http://localhost:8000"
echo "  - Admin Dashboard: http://localhost:3000"
echo "  - PostgreSQL:      localhost:5432"
echo ""
echo "Sample credentials:"
echo "  - Admin:   admin@hkcs.com / password123"
echo "  - Driver:  james@hkcs.com / password123"
echo "  - Parent:  john@example.com / password123"
echo ""

echo -e "${GREEN}=========================================="
echo "Demo setup complete!"
echo "==========================================${NC}"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "To reset database:"
echo "  docker-compose down -v"
echo "  ./scripts/demo.sh"
echo ""