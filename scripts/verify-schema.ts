import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false
    }
};

async function verifySchema() {
    try {
        console.log('Connecting...');
        const pool = await sql.connect(config);

        console.log('--- Columns in employees table ---');
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'employees'");

        const columns = result.recordset.map(r => r.COLUMN_NAME);
        console.log(columns.join(', '));

        const required = ['requester', 'line_manager_status', 'pending_line_manager', 'is_direct'];
        const missing = required.filter(c => !columns.includes(c));

        if (missing.length > 0) {
            console.error('❌ MISSING columns:', missing.join(', '));
        } else {
            console.log('✅ All required columns present.');
        }

        pool.close();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

verifySchema();
