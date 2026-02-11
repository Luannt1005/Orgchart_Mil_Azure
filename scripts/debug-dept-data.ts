
import sql from 'mssql';
import fs from 'fs';
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
        trustServerCertificate: false // Updated per check-data.ts
    }
};

async function verify() {
    try {
        console.log('Connecting to Azure SQL...');
        const pool = await sql.connect(sqlConfig as any);
        console.log('Connected.');

        // 1. List distinct departments
        console.log('--- Distinct Departments ---');
        const deptResult = await pool.request().query("SELECT DISTINCT dept FROM employees WHERE dept IS NOT NULL ORDER BY dept");
        const depts = deptResult.recordset.map(r => r.dept);
        console.log(depts);

        if (depts.length === 0) {
            console.log("No departments found!");
            return;
        }

        // 2. Pick the first one and fetch its data via API logic (simulation)
        // Let's pick a known tricky one if possible, or just the first.
        const testDept = depts[0];
        console.log(`\n--- Testing fetch for dept: "${testDept}" ---`);

        const req = pool.request();
        req.input('dept', sql.NVarChar, testDept);
        const empResult = await req.query("SELECT * FROM employees WHERE dept = @dept AND emp_id IS NOT NULL");
        const employees = empResult.recordset;
        console.log(`Found ${employees.length} employees.`);

        // 3. Transform logic (copy-paste minimal version from route.ts)
        const output: any[] = [];
        const deptMap = new Map();

        employees.forEach((emp: any) => {
            const empId = String(emp.emp_id || "").trim();
            if (!empId) return;

            // Simple manager logic
            const managerRaw = emp.line_manager;
            let managerPart = managerRaw ? String(managerRaw).split(":")[0].trim() : null;
            // trimLeadingZeros logic
            const trimLeadingZeros = (val: string | null) => {
                if (!val) return null;
                const t = String(val).replace(/^0+/, '') || '0';
                return t === '0' ? null : t;
            };

            const managerId = trimLeadingZeros(managerPart);

            const currentDept = emp.dept || "";
            // logic from route.ts
            const deptManagerId = managerId;
            const deptKey = `dept:${currentDept}:${deptManagerId}`;

            // In route.ts logic:
            // deptMap.set(deptKey, { dept: currentDept, managerId, isIndirectManager });
            // We simplify here
            deptMap.set(deptKey, { dept: currentDept, managerId });

            output.push({
                id: empId,
                pid: managerId, // This might be null if no manager
                stpid: deptKey, // This links to Dept Group Node
                name: emp.full_name
            });
        });

        // Add Dept Nodes
        deptMap.forEach((v, k) => {
            output.push({
                id: k,
                pid: v.managerId, // Dept Node pid is managerId
                name: v.dept,
                tags: ["group"]
            });
        });

        console.log(`Transformed Nodes: ${output.length} (Employees: ${employees.length}, Groups: ${deptMap.size})`);

        // Debug PID validity
        const allIds = new Set(output.map(n => n.id));
        const missingPids = new Set();

        output.forEach(n => {
            if (n.pid && !allIds.has(n.pid)) {
                missingPids.add(n.pid);
                // console.log(`Node ${n.id} has missing PID: ${n.pid}`);
            }
        });

        console.log(`Ensure unique missing PIDs count: ${missingPids.size}`);
        console.log(`Missing PIDs:`, Array.from(missingPids));

        // How many roots (pid maps to nowhere or null)?
        // In OrgChart JS:
        // - if stpid is present, it looks for stpid.
        // - if pid is present, it looks for pid.
        // If pid is missing, it is a root.

        const trueRoots = output.filter(n => !n.pid || !allIds.has(n.pid));
        console.log(`True Roots (pid missing or null): ${trueRoots.length}`);
        if (trueRoots.length > 0) {
            console.log("Sample Roots:", trueRoots.slice(0, 3).map(r => ({ id: r.id, pid: r.pid, stpid: r.stpid, name: r.name })));
        }

        const debugInfo = {
            depts,
            testDept,
            employeesCount: employees.length,
            nodesCount: output.length,
            groupsCount: deptMap.size,
            rootsCount: trueRoots.length,
            first3Roots: trueRoots.slice(0, 3).map(r => ({ id: r.id, pid: r.pid, stpid: r.stpid, name: r.name })),
            sampleNode: output[0]
        };

        fs.writeFileSync('scripts/debug-data.json', JSON.stringify(debugInfo, null, 2), 'utf8');
        console.log('Debug data written to scripts/debug-data.json');

        pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

verify();
