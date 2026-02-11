
import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Azure SQL Config
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function main() {
    try {
        console.log('Connecting to Azure SQL...');
        const pool = await sql.connect(sqlConfig);
        console.log('Connected.');

        console.log('Checking custom_orgcharts columns...');
        const cols = await pool.request().query("SELECT TOP 1 * FROM custom_orgcharts");
        if (cols.recordset.length > 0) {
            const row = cols.recordset[0];
            console.log('Columns found:', Object.keys(row));
            if ('is_public' in row) {
                console.log('SUCCESS: is_public column exists.');
            } else {
                console.error('FAILURE: is_public column MISSING.');
            }
        } else {
            console.log('Table is empty, checking schema...');
            const schema = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'custom_orgcharts'");
            const columns = schema.recordset.map(r => r.COLUMN_NAME);
            console.log('Schema Columns:', columns);
            if (columns.includes('is_public')) {
                console.log('SUCCESS: is_public column exists in schema.');
            } else {
                console.error('FAILURE: is_public column MISSING from schema.');
            }
        }

        pool.close();
    } catch (err) {
        console.error('Check failed:', err);
    }
}

main();
