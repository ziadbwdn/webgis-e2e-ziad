import * as fs from 'fs';
import { initializePool, getPool } from './src/db/connection';

const files = [
  { path: '../client/data/highway_primary.geojson', highway: 'primary' },
  { path: '../client/data/highway_secondary.geojson', highway: 'secondary' },
  { path: '../client/data/highway_tertiary.geojson', highway: 'tertiary' },
  { path: '../client/data/highway_trunk.geojson', highway: 'trunk' },
  { path: '../client/data/all-routes_v2.geojson', highway: 'residential' }
];

async function importData() {
  initializePool();
  const pool = getPool();
  let totalImported = 0;

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
      console.log(`\nProcessing ${file.path}: ${data.features.length} features`);

      for (const feature of data.features) {
        const geom = feature.geometry;
        const props = feature.properties || {};

        let lineStrings = [];
        if (geom.type === 'LineString') {
          lineStrings.push(geom.coordinates);
        } else if (geom.type === 'MultiLineString') {
          lineStrings = geom.coordinates;
        }

        for (const coords of lineStrings) {
          const wkt = 'LINESTRING(' + coords.map((c: number[]) => c[0] + ' ' + c[1]).join(',') + ')';

          await pool.query(
            'INSERT INTO roads_network (osm_id, name, highway, oneway, maxspeed, geom) VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326))',
            [
              props.osm_id || null,
              props.name || null,
              file.highway,
              props.oneway || 'no',
              props.maxspeed || null,
              wkt
            ]
          );
          totalImported++;
        }
      }
      console.log(`✓ Imported ${file.highway}`);
    } catch (err: any) {
      console.error(`Error with ${file.path}:`, err.message);
    }
  }

  console.log(`\nTotal imported: ${totalImported} road segments`);
  process.exit(0);
}

importData().catch(console.error);
