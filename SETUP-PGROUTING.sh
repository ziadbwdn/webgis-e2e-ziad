#!/bin/bash
# pgRouting Installation & Setup Script
# Run this script with: bash ./SETUP-PGROUTING.sh
# Or execute each step manually in your terminal

set -e

echo "==================================="
echo "pgRouting Installation & Setup"
echo "==================================="
echo ""

# Step 1: Update package lists
echo "📦 Step 1: Updating package lists..."
sudo apt-get update

# Step 2: Install pgRouting and osm2pgrouting
echo "📦 Step 2: Installing pgRouting and osm2pgrouting..."
sudo apt-get install -y postgresql-16-pgrouting osm2pgrouting

# Step 3: Enable pgRouting extension in database
echo "🔧 Step 3: Creating pgRouting extension in PostgreSQL..."
PGPASSWORD=iwakpeyek23 psql -U postgres -d mapid_webgis -h localhost << 'EOF'
CREATE EXTENSION IF NOT EXISTS pgrouting;
SELECT pgr_version();
EOF

echo ""
echo "✅ pgRouting installation complete!"
echo ""
echo "Next steps (Run in PostgreSQL or bash script):"
echo "1. Create roads_network table"
echo "2. Import GeoJSON data"
echo "3. Build network topology"
echo "4. Calculate routing costs"
echo ""
echo "Run: bash ./SETUP-ROADS-NETWORK.sh"
