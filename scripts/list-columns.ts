import { getDbConnection } from '../src/lib/db';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function listColumns() {
    try {
        console.log('Connecting to Azure SQL...');
        const pool = await getDbConnection();
        console.log('Connected.');

        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees'");

        console.log("Columns in 'employees' table:");
        result.recordset.forEach(row => console.log(` - ${row.COLUMN_NAME}`));

        process.exit(0);
    } catch (err) {
        console.error('Script failed:', err);
        process.exit(1);
    }
}

listColumns();
