const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mapid_webgis',
  user: 'postgres',
  password: 'iwakpeyek23'
});

async function importResidentialRoads() {
  try {
    console.log('Reading residential roads GeoJSON file...');
    const data = JSON.parse(fs.readFileSync('/home/user/mapid-webgis/client/data/highway_residentialgeojson.geojson', 'utf8'));

    console.log(`Found ${data.features.length} residential road features`);

    let imported = 0;
    let skipped = 0;

    for (const feature of data.features) {
      const props = feature.properties;
      const geom = feature.geometry;

      if (geom.type !== 'LineString') {
        skipped++;
        continue;
      }

      // Convert GeoJSON coordinates to WKT
      const coords = geom.coordinates.map(c => `${c[0]} ${c[1]}`).join(',');
      const wkt = `LINESTRING(${coords})`;

      try {
        await pool.query(`
          INSERT INTO roads_network (osm_id, name, highway, oneway, maxspeed, geom)
          VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326))
        `, [
          props.osm_id || props['@id'] || null,
          props.name || null,
          'residential',
          props.oneway || 'no',
          props.maxspeed || null,
          wkt
        ]);
        imported++;

        if (imported % 1000 === 0) {
          console.log(`  Imported ${imported} roads...`);
        }
      } catch (err) {
        console.error(`Error importing road:`, err.message);
        skipped++;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped: ${skipped}`);

    // Update topology
    console.log('\nUpdating topology...');
    await pool.query(`
      SELECT pgr_createTopology(
        'roads_network',
        0.00001,
        'geom',
        'id',
        'source',
        'target',
        overwrite := TRUE
      );
    `);

    console.log('Topology updated!');

    // Recalculate costs
    console.log('\nRecalculating routing costs...');
    await pool.query(`
      UPDATE roads_network SET
        length_m = ST_Length(geom::geography),
        cost = ST_Length(geom::geography) / (
          CASE
            WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0
            WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0
            WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0
            WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0
            WHEN highway = 'tertiary' THEN 40.0 * 1000.0 / 3600.0
            WHEN highway = 'residential' THEN 30.0 * 1000.0 / 3600.0
            ELSE 25.0 * 1000.0 / 3600.0
          END
        ),
        reverse_cost = CASE
          WHEN oneway IN ('yes', '1', 'true') THEN -1
          ELSE ST_Length(geom::geography) / (
            CASE
              WHEN highway = 'motorway' THEN 110.0 * 1000.0 / 3600.0
              WHEN highway = 'trunk' THEN 90.0 * 1000.0 / 3600.0
              WHEN highway = 'primary' THEN 70.0 * 1000.0 / 3600.0
              WHEN highway = 'secondary' THEN 50.0 * 1000.0 / 3600.0
              WHEN highway = 'tertiary' THEN 40.0 * 1000.0 / 3600.0
              WHEN highway = 'residential' THEN 30.0 * 1000.0 / 3600.0
              ELSE 25.0 * 1000.0 / 3600.0
            END
          )
        END
      WHERE cost IS NULL OR highway = 'residential';
    `);

    console.log('Costs recalculated!');

    // Show stats
    const stats = await pool.query(`
      SELECT highway, COUNT(*) as count
      FROM roads_network
      GROUP BY highway
      ORDER BY COUNT(*) DESC;
    `);

    console.log('\nRoad network statistics:');
    console.table(stats.rows);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

importResidentialRoads();
