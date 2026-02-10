
import { createClient } from '@supabase/supabase-js';
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

// Supabase Config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables(pool: sql.ConnectionPool) {
    console.log('Creating tables in Azure SQL...');

    try {
        // 1. Users
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            BEGIN
                CREATE TABLE users (
                    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    username NVARCHAR(50) UNIQUE NOT NULL,
                    password NVARCHAR(MAX) NOT NULL,
                    full_name NVARCHAR(100) NOT NULL,
                    role NVARCHAR(20) DEFAULT 'user',
                    created_at DATETIME2 DEFAULT SYSDATETIME(),
                    updated_at DATETIME2 DEFAULT SYSDATETIME()
                );
                CREATE INDEX idx_users_username ON users(username);
            END
        `);
        console.log(' - Table users check/create: OK');

        // 2. Employees (Note: JSONB -> NVARCHAR(MAX))
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='employees' AND xtype='U')
            BEGIN
                CREATE TABLE employees (
                    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    emp_id NVARCHAR(20) UNIQUE NOT NULL,
                    full_name NVARCHAR(200),
                    job_title NVARCHAR(200),
                    dept NVARCHAR(200),
                    bu NVARCHAR(100),
                    bu_org_3 NVARCHAR(100),
                    dl_idl_staff NVARCHAR(50),
                    location NVARCHAR(200),
                    employee_type NVARCHAR(100),
                    line_manager NVARCHAR(200),
                    line_manager_status NVARCHAR(50),
                    pending_line_manager NVARCHAR(200),
                    is_direct NVARCHAR(20),
                    requester NVARCHAR(100),
                    joining_date NVARCHAR(50),
                    last_working_day NVARCHAR(50),
                    raw_data NVARCHAR(MAX),
                    imported_at DATETIME2 DEFAULT SYSDATETIME(),
                    updated_at DATETIME2 DEFAULT SYSDATETIME()
                );
                CREATE INDEX idx_employees_emp_id ON employees(emp_id);
                CREATE INDEX idx_employees_dept ON employees(dept);
            END
        `);
        console.log(' - Table employees check/create: OK');

        // 3. Orgchart Nodes
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='orgchart_nodes' AND xtype='U')
            BEGIN
                CREATE TABLE orgchart_nodes (
                    id NVARCHAR(200) PRIMARY KEY,
                    pid NVARCHAR(200),
                    stpid NVARCHAR(200),
                    name NVARCHAR(300),
                    title NVARCHAR(200),
                    image NVARCHAR(MAX),
                    tags NVARCHAR(MAX),
                    orig_pid NVARCHAR(200),
                    dept NVARCHAR(200),
                    bu NVARCHAR(100),
                    type NVARCHAR(50),
                    location NVARCHAR(200),
                    description NVARCHAR(MAX),
                    joining_date NVARCHAR(50),
                    created_at DATETIME2 DEFAULT SYSDATETIME(),
                    updated_at DATETIME2 DEFAULT SYSDATETIME()
                );
                CREATE INDEX idx_orgchart_nodes_pid ON orgchart_nodes(pid);
            END
        `);
        console.log(' - Table orgchart_nodes check/create: OK');

        // 4. Custom Orgcharts
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='custom_orgcharts' AND xtype='U')
            BEGIN
                CREATE TABLE custom_orgcharts (
                    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
                    username NVARCHAR(50) NOT NULL,
                    orgchart_name NVARCHAR(200) NOT NULL,
                    description NVARCHAR(MAX),
                    org_data NVARCHAR(MAX),
                    created_at DATETIME2 DEFAULT SYSDATETIME(),
                    updated_at DATETIME2 DEFAULT SYSDATETIME()
                );
                CREATE INDEX idx_custom_orgcharts_username ON custom_orgcharts(username);
            END
        `);
        console.log(' - Table custom_orgcharts check/create: OK');

    } catch (err) {
        console.error('Error creating tables:', err);
        throw err;
    }
}

async function migrateData(pool: sql.ConnectionPool) {
    console.log('\n--- Starting Data Migration ---');

    // 1. Migrate Users
    console.log('Migrating users...');
    const { data: users, error: usersErr } = await supabase.from('users').select('*');
    if (usersErr) throw usersErr;

    if (users && users.length > 0) {
        let count = 0;
        for (const user of users) {
            // Check if exists
            const check = await pool.request()
                .input('username', sql.NVarChar, user.username)
                .query('SELECT id FROM users WHERE username = @username');

            if (check.recordset.length === 0) {
                await pool.request()
                    .input('id', sql.UniqueIdentifier, user.id) // Try to keep same ID if possible, assuming GUID
                    .input('username', sql.NVarChar, user.username)
                    .input('password', sql.NVarChar, user.password)
                    .input('full_name', sql.NVarChar, user.full_name)
                    .input('role', sql.NVarChar, user.role)
                    .query(`INSERT INTO users (id, username, password, full_name, role) VALUES (@id, @username, @password, @full_name, @role)`);
                count++;
            }
        }
        console.log(`Migrated ${count} users.`);
    }

    // 2. Migrate Employees
    console.log('Migrating employees...');
    // We might have many employees, so we should chunk or just fetch all if allowed. Supabase limit is usually 1000.
    // Fetch all using pagination if needed, but for simplicity attempting max 1000 first.
    const { data: employees, error: empErr } = await supabase.from('employees').select('*').limit(5000);
    if (empErr) throw empErr;

    if (employees && employees.length > 0) {
        let count = 0;
        for (const emp of employees) {
            const check = await pool.request()
                .input('emp_id', sql.NVarChar, emp.emp_id)
                .query('SELECT id FROM employees WHERE emp_id = @emp_id');

            if (check.recordset.length === 0) {
                await pool.request()
                    .input('emp_id', sql.NVarChar, emp.emp_id)
                    .input('full_name', sql.NVarChar, emp.full_name)
                    .input('job_title', sql.NVarChar, emp.job_title)
                    .input('dept', sql.NVarChar, emp.dept)
                    .input('bu', sql.NVarChar, emp.bu)
                    .input('dl_idl_staff', sql.NVarChar, emp.dl_idl_staff)
                    .input('location', sql.NVarChar, emp.location)
                    .input('employee_type', sql.NVarChar, emp.employee_type)
                    .input('line_manager', sql.NVarChar, emp.line_manager)
                    .input('joining_date', sql.NVarChar, emp.joining_date)
                    .input('raw_data', sql.NVarChar, JSON.stringify(emp.raw_data))
                    .query(`INSERT INTO employees (emp_id, full_name, job_title, dept, bu, dl_idl_staff, location, employee_type, line_manager, joining_date, raw_data) 
                           VALUES (@emp_id, @full_name, @job_title, @dept, @bu, @dl_idl_staff, @location, @employee_type, @line_manager, @joining_date, @raw_data)`);
                count++;
            }
        }
        console.log(`Migrated ${count} employees.`);
    }

    // 3. Migrate Orgchart Nodes
    console.log('Migrating orgchart_nodes...');
    const { data: nodes, error: nodesErr } = await supabase.from('orgchart_nodes').select('*').limit(5000);
    if (nodesErr) throw nodesErr;

    if (nodes && nodes.length > 0) {
        let count = 0;
        for (const node of nodes) {
            const check = await pool.request()
                .input('id', sql.NVarChar, node.id)
                .query('SELECT id FROM orgchart_nodes WHERE id = @id');

            if (check.recordset.length === 0) {
                await pool.request()
                    .input('id', sql.NVarChar, node.id)
                    .input('pid', sql.NVarChar, node.pid)
                    .input('stpid', sql.NVarChar, node.stpid)
                    .input('name', sql.NVarChar, node.name)
                    .input('title', sql.NVarChar, node.title)
                    .input('image', sql.NVarChar, node.image)
                    .input('tags', sql.NVarChar, JSON.stringify(node.tags))
                    .input('dept', sql.NVarChar, node.dept)
                    .input('bu', sql.NVarChar, node.bu)
                    .input('type', sql.NVarChar, node.type)
                    .input('location', sql.NVarChar, node.location)
                    .input('description', sql.NVarChar, node.description)
                    .input('joining_date', sql.NVarChar, node.joining_date)
                    .query(`INSERT INTO orgchart_nodes (id, pid, stpid, name, title, image, tags, dept, bu, type, location, description, joining_date)
                            VALUES (@id, @pid, @stpid, @name, @title, @image, @tags, @dept, @bu, @type, @location, @description, @joining_date)`);
                count++;
            }
        }
        console.log(`Migrated ${count} nodes.`);
    }
}

async function main() {
    try {
        console.log('Connecting to Azure SQL...');
        const pool = await sql.connect(sqlConfig);
        console.log('Connected.');

        await createTables(pool);
        await migrateData(pool);

        console.log('Migration completed successfully.');
        pool.close();
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();
