import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading env from ${envPath}`);
dotenv.config({ path: envPath });

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

async function fixMissingColumns() {
    try {
        console.log("Config:", {
            user: config.user,
            server: config.server,
            database: config.database
        });

        console.log('Connecting to Azure SQL...');
        const pool = await sql.connect(config);
        console.log('Connected.');

        const columnsToAdd = [
            { name: 'bu_org_3', type: 'NVARCHAR(100)' },
            { name: 'last_working_day', type: 'NVARCHAR(50)' },
            { name: 'line_manager_status', type: 'NVARCHAR(50)' },
            { name: 'pending_line_manager', type: 'NVARCHAR(200)' },
            { name: 'is_direct', type: 'NVARCHAR(20)' },
            { name: 'requester', type: 'NVARCHAR(100)' }
        ];

        for (const col of columnsToAdd) {
            try {
                // Check if column exists
                const check = await pool.request().query(`
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'employees' AND COLUMN_NAME = '${col.name}'
                `);

                if (check.recordset.length === 0) {
                    console.log(`Adding column ${col.name}...`);
                    await pool.request().query(`ALTER TABLE employees ADD ${col.name} ${col.type}`);
                    console.log(`✅ Added column ${col.name}.`);
                } else {
                    console.log(`ℹ️ Column ${col.name} already exists.`);
                }
            } catch (err: any) {
                console.error(`❌ Error adding column ${col.name}:`, err.message);
            }
        }

        console.log('Fix completed.');
        pool.close();
        process.exit(0);
    } catch (err) {
        console.error('Script failed:', err);
        process.exit(1);
    }
}

fixMissingColumns();
