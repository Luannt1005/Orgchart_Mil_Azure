
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

        console.log('Adding is_public column to custom_orgcharts table...');

        // Check if column exists first
        const checkResult = await pool.request().query(`
            SELECT * FROM sys.columns 
            WHERE Name = N'is_public' 
            AND Object_ID = Object_ID(N'custom_orgcharts')
        `);

        if (checkResult.recordset.length > 0) {
            console.log('Column is_public already exists.');
        } else {
            await pool.request().query(`
                ALTER TABLE custom_orgcharts
                ADD is_public BIT DEFAULT 0;
            `);
            console.log('Column is_public added successfully.');
        }

        console.log('Migration completed.');
        pool.close();
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();
