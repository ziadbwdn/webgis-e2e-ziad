import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';
import { databaseConfig } from './src/config/database.config';

const pool = new Pool(databaseConfig);

interface GeoJSONFeature {
  type: string;
  geometry: any;
  properties: any;
}

interface GeoJSON {
  type: string;
  features: GeoJSONFeature[];
}

async function importDefaultLayers() {
  const client = await pool.connect();

  try {
    console.log('Starting default layers import...\n');

    // Step 1: Delete existing empty default layers (keep only ID 1 - Indonesia OSM Base)
    console.log('Step 1: Removing existing default layers...');
    const deleteResult = await client.query('DELETE FROM layers WHERE is_default = true AND id != 1');
    console.log(`✓ Removed ${deleteResult.rowCount} existing default layers\n`);

    // Step 2: Import Population Density Layer
    console.log('Step 2: Importing Population Density layer...');
    const sesPath = path.join(__dirname, 'data', 'ses-surabaya-2024.geojson');
    const sesData: GeoJSON = JSON.parse(fs.readFileSync(sesPath, 'utf-8'));

    // Calculate population density for each feature
    sesData.features.forEach((feature: GeoJSONFeature) => {
      const areaKm2 = turf.area(feature) / 1000000; // Convert m² to km²
      const population = feature.properties['JUMLAH PENDUDUK'] || 0;
      feature.properties['POPULATION_DENSITY'] = areaKm2 > 0 ? population / areaKm2 : 0;
    });

    const popDensityResult = await client.query(
      `INSERT INTO layers (name, description, type, is_default, created_by)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING id`,
      [
        'Population Density',
        'Population density calculated from SES data (people per km²)',
        'polygon',
        true
      ]
    );
    const popDensityLayerId = popDensityResult.rows[0].id;

    // Insert features
    let count = 0;
    for (const feature of sesData.features) {
      if (count === 0) {
        console.log(`Sample feature properties:`, feature.properties);
      }
      await client.query(
        `INSERT INTO layer_features (layer_id, geom, properties)
         VALUES ($1, ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)), $3)`,
        [
          popDensityLayerId,
          JSON.stringify(feature.geometry),
          JSON.stringify(feature.properties)
        ]
      );
      count++;
    }
    console.log(`✓ Imported Population Density layer (ID: ${popDensityLayerId}, ${count} features)\n`);

    // Step 3: Import Economic Status Layer
    console.log('Step 3: Importing Economic Status layer...');
    const economicResult = await client.query(
      `INSERT INTO layers (name, description, type, is_default, created_by)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING id`,
      [
        'Economic Status',
        'Socioeconomic status classification for Surabaya',
        'polygon',
        true
      ]
    );
    const economicLayerId = economicResult.rows[0].id;

    // Insert features (same SES data but different layer)
    count = 0;
    for (const feature of sesData.features) {
      await client.query(
        `INSERT INTO layer_features (layer_id, geom, properties)
         VALUES ($1, ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)), $3)`,
        [
          economicLayerId,
          JSON.stringify(feature.geometry),
          JSON.stringify(feature.properties)
        ]
      );
      count++;
    }
    console.log(`✓ Imported Economic Status layer (ID: ${economicLayerId}, ${count} features)\n`);

    // Step 4: Import Old Public Routes Layer
    console.log('Step 4: Importing Old Public Routes layer...');
    const oldRoutesPath = path.join(__dirname, 'data', 'old-public-routes.geojson');
    const oldRoutesData: GeoJSON = JSON.parse(fs.readFileSync(oldRoutesPath, 'utf-8'));

    const oldRoutesResult = await client.query(
      `INSERT INTO layers (name, description, type, is_default, created_by)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING id`,
      [
        'Old Public Routes',
        'Historical public transportation routes for Surabaya',
        'linestring',
        true
      ]
    );
    const oldRoutesLayerId = oldRoutesResult.rows[0].id;

    count = 0;
    for (const feature of oldRoutesData.features) {
      await client.query(
        `INSERT INTO layer_features (layer_id, geom, properties)
         VALUES ($1, ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)), $3)`,
        [
          oldRoutesLayerId,
          JSON.stringify(feature.geometry),
          JSON.stringify(feature.properties)
        ]
      );
      count++;
    }
    console.log(`✓ Imported Old Public Routes layer (ID: ${oldRoutesLayerId}, ${count} features)\n`);

    // Step 5: Import Recent Routes Layer
    console.log('Step 5: Importing Recent Routes layer...');
    const recentRoutesPath = path.join(__dirname, 'data', 'recent-routes.geojson');
    const recentRoutesData: GeoJSON = JSON.parse(fs.readFileSync(recentRoutesPath, 'utf-8'));

    const recentRoutesResult = await client.query(
      `INSERT INTO layers (name, description, type, is_default, created_by)
       VALUES ($1, $2, $3, $4, NULL)
       RETURNING id`,
      [
        'Recent Routes',
        'Current public transportation routes for Surabaya',
        'linestring',
        true
      ]
    );
    const recentRoutesLayerId = recentRoutesResult.rows[0].id;

    count = 0;
    for (const feature of recentRoutesData.features) {
      await client.query(
        `INSERT INTO layer_features (layer_id, geom, properties)
         VALUES ($1, ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)), $3)`,
        [
          recentRoutesLayerId,
          JSON.stringify(feature.geometry),
          JSON.stringify(feature.properties)
        ]
      );
      count++;
    }
    console.log(`✓ Imported Recent Routes layer (ID: ${recentRoutesLayerId}, ${count} features)\n`);

    console.log('✅ All default layers imported successfully!');

  } catch (error) {
    console.error('❌ Error importing default layers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
importDefaultLayers()
  .then(() => {
    console.log('\n🎉 Import completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import failed:', error);
    process.exit(1);
  });
