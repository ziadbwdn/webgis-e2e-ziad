#!/usr/bin/env ts-node
/**
 * Roads Network GeoJSON Importer
 * Imports highway GeoJSON files into PostgreSQL using the application's layer upload API
 *
 * This script leverages the existing /api/layers/upload endpoint which:
 * 1. Creates a layer record
 * 2. Converts GeoJSON to WKT
 * 3. Inserts features into PostgreSQL with proper PostGIS handling
 *
 * Usage: ts-node IMPORT-ROADS-GEOJSON.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Database and Layer Model imports (same as server)
import { getPool } from './server/src/db/connection';
import { LayerModel } from './server/src/models/layer.model';
import type { GeoJSONFeature } from './server/src/types';

interface RoadFile {
  path: string;
  layerName: string;
  description: string;
  highwayType: string;
}

const ROAD_FILES: RoadFile[] = [
  {
    path: 'client/data/highway_primary.geojson',
    layerName: 'Highway Primary - Surabaya',
    description: 'Primary roads (arteri) in Surabaya city',
    highwayType: 'primary'
  },
  {
    path: 'client/data/highway_secondary.geojson',
    layerName: 'Highway Secondary - Surabaya',
    description: 'Secondary roads (kolektor) in Surabaya city',
    highwayType: 'secondary'
  },
  {
    path: 'client/data/highway_tertiary.geojson',
    layerName: 'Highway Tertiary - Surabaya',
    description: 'Tertiary roads (lokal) in Surabaya city',
    highwayType: 'tertiary'
  },
  {
    path: 'client/data/highway_trunk.geojson',
    layerName: 'Highway Trunk - Surabaya',
    description: 'Trunk roads (jalan tol) in Surabaya city',
    highwayType: 'trunk'
  },
  {
    path: 'client/data/all-routes_v2.geojson',
    layerName: 'All Routes v2 - Surabaya',
    description: 'Complete public routes network in Surabaya',
    highwayType: 'residential'
  }
];

async function importGeojsonFile(file: RoadFile): Promise<void> {
  console.log(`\n📂 Processing: ${file.layerName}`);

  const filePath = path.resolve(file.path);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  try {
    // Read GeoJSON file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const geojsonData = JSON.parse(fileContent);

    if (geojsonData.type !== 'FeatureCollection') {
      console.error(`❌ Not a FeatureCollection: ${file.path}`);
      return;
    }

    const features: GeoJSONFeature[] = geojsonData.features;
    console.log(`   Found ${features.length} features`);

    // Create layer with features using the LayerModel
    // This automatically converts GeoJSON to WKT and inserts into PostGIS
    const layer = await LayerModel.createLayerWithFeatures(
      file.layerName,
      file.description,
      features[0]?.geometry?.type?.toLowerCase() || 'unknown',
      null,  // No user ID - default layer
      features
    );

    console.log(`✅ Imported ${features.length} features into layer ID: ${layer.id}`);
  } catch (error) {
    console.error(`❌ Error processing ${file.path}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function createRoadsNetworkTable(): Promise<void> {
  console.log('\n🔧 Creating roads_network table structure...');

  const pool = getPool();

  try {
    // Create the roads_network table for routing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roads_network (
        id SERIAL PRIMARY KEY,
        osm_id BIGINT,
        name VARCHAR(255),
        highway VARCHAR(50),
        oneway VARCHAR(10),
        maxspeed INTEGER,
        geom GEOMETRY(LineString, 4326),
        source INTEGER,
        target INTEGER,
        cost DOUBLE PRECISION,
        reverse_cost DOUBLE PRECISION,
        length_m DOUBLE PRECISION
      );

      CREATE INDEX IF NOT EXISTS roads_network_geom_idx ON roads_network USING GIST(geom);
      CREATE INDEX IF NOT EXISTS roads_network_source_idx ON roads_network(source);
      CREATE INDEX IF NOT EXISTS roads_network_target_idx ON roads_network(target);
    `);

    console.log('✅ roads_network table created successfully');
  } catch (error) {
    console.error('❌ Error creating roads_network table:', error);
    throw error;
  }
}

async function populateRoadsNetwork(): Promise<void> {
  console.log('\n📊 Populating roads_network table from layer_features...');

  const pool = getPool();

  try {
    // Copy geometries from the imported layers into roads_network
    // This assumes the layers have been imported using LayerModel.createLayerWithFeatures
    await pool.query(`
      INSERT INTO roads_network (name, highway, geom, oneway, maxspeed)
      SELECT
        properties->>'name' as name,
        properties->>'highway' as highway,
        geom,
        properties->>'oneway' as oneway,
        (properties->>'maxspeed')::INTEGER as maxspeed
      FROM layer_features
      WHERE layer_id IN (
        SELECT id FROM layers
        WHERE name LIKE 'Highway%' OR name LIKE 'All Routes%'
      )
      ON CONFLICT DO NOTHING;
    `);

    const result = await pool.query('SELECT COUNT(*) FROM roads_network');
    const count = result.rows[0].count;
    console.log(`✅ Populated ${count} rows in roads_network table`);
  } catch (error) {
    console.error('❌ Error populating roads_network:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Roads Network GeoJSON Importer');
  console.log('='.repeat(50));

  try {
    // Step 1: Create roads_network table
    await createRoadsNetworkTable();

    // Step 2: Import each GeoJSON file as a layer
    for (const file of ROAD_FILES) {
      await importGeojsonFile(file);
    }

    // Step 3: Populate roads_network from imported layers
    await populateRoadsNetwork();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Import complete!');
    console.log('='.repeat(50));
    console.log('\n📋 Next steps:');
    console.log('1. Build network topology: bash SETUP-ROADS-TOPOLOGY.sh');
    console.log('2. Calculate costs: bash SETUP-ROADS-COSTS.sh');
    console.log('3. Test routing: Test pgRouting queries');

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
