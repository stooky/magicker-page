// Export PostgreSQL database tables to CSV files
const path = require('path');
const { Pool } = require('pg');
const fs = require('fs');

// Try to connect to the database specified in .env, fallback to 'botpress'
async function createPool() {
    const dbName = 'mp';  // Hardcoded for now
    const port = 5433;    // Hardcoded to match docker-compose port mapping

    console.log('Connecting with:');
    console.log('  Database:', dbName);
    console.log('  Port:', port);

    const config = {
        user: 'postgres',
        host: 'localhost',
        password: 'magicpage_password',  // Try the old password first
        port: port,
    };

    // Try primary database first
    let pool = new Pool({ ...config, database: dbName });
    try {
        await pool.query('SELECT 1');
        console.log(`Connected to database: ${dbName}`);
        return pool;
    } catch (err) {
        console.log(`Cannot connect to ${dbName}:`, err.code || err.message || err);
        await pool.end();

        // Try 'botpress' database as fallback
        if (dbName !== 'botpress') {
            console.log('Trying botpress database instead...');
            pool = new Pool({ ...config, database: 'botpress' });
            try {
                await pool.query('SELECT 1');
                console.log('Connected to database: botpress');
                return pool;
            } catch (err2) {
                console.log(`Cannot connect to botpress:`, err2.code || err2.message || err2);
                await pool.end();
            }
        }

        throw new Error(`Could not connect to any database. Config: ${JSON.stringify({ ...config, password: '***' }, null, 2)}`);
    }
}

// Output directory
const outputDir = path.join(__dirname, '..', 'db_dump');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function exportDatabase() {
    let pool;
    try {
        console.log('Connecting to database...');
        pool = await createPool();

        // Get list of all tables
        const tablesQuery = `
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `;

        const tablesResult = await pool.query(tablesQuery);
        const tables = tablesResult.rows.map(row => row.tablename);

        console.log(`Found ${tables.length} tables:`, tables);

        // Export each table to CSV
        for (const tableName of tables) {
            console.log(`\nExporting ${tableName}...`);

            try {
                // Get all data from table
                const dataQuery = `SELECT * FROM ${tableName}`;
                const dataResult = await pool.query(dataQuery);

                if (dataResult.rows.length === 0) {
                    console.log(`  ${tableName} is empty, skipping...`);
                    continue;
                }

                // Get column names
                const columns = Object.keys(dataResult.rows[0]);

                // Create CSV content
                let csvContent = columns.join(',') + '\n';

                for (const row of dataResult.rows) {
                    const values = columns.map(col => {
                        let value = row[col];

                        // Handle null values
                        if (value === null || value === undefined) {
                            return '';
                        }

                        // Convert to string and escape quotes
                        value = String(value).replace(/"/g, '""');

                        // Wrap in quotes if contains comma, newline, or quote
                        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                            return `"${value}"`;
                        }

                        return value;
                    });

                    csvContent += values.join(',') + '\n';
                }

                // Write to file
                const filePath = path.join(outputDir, `${tableName}.csv`);
                fs.writeFileSync(filePath, csvContent, 'utf8');

                console.log(`  ✓ Exported ${dataResult.rows.length} rows to ${tableName}.csv`);
            } catch (tableError) {
                console.error(`  ✗ Error exporting ${tableName}:`, tableError.message);
            }
        }

        console.log(`\n✓ Database export completed! Files saved to: ${outputDir}`);

    } catch (error) {
        console.error('Error exporting database:', error);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Run export
exportDatabase();
