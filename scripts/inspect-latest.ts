import sql from 'mssql';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: false // Assuming this is correct from check-data.ts
    }
};

async function verify() {
    try {
        console.log('Connecting to Azure SQL...');
        const pool = await sql.connect(sqlConfig as any);
        console.log('Connected.');

        const result = await pool.request().query("SELECT TOP 1 * FROM custom_orgcharts ORDER BY created_at DESC");

        if (result.recordset.length === 0) {
            console.log("No orgcharts found");
            return;
        }

        const chart = result.recordset[0];
        console.log(`Found chart: "${chart.orgchart_name}" (ID: ${chart.id})`);

        try {
            // org_data might be double-stringified?
            let orgDataRaw = chart.org_data;
            if (typeof orgDataRaw === 'string') {
                if (orgDataRaw.startsWith('"') && orgDataRaw.endsWith('"')) {
                    // It looks like a stringified JSON string?
                    // Let's try parsing once
                    orgDataRaw = JSON.parse(orgDataRaw);
                }
            }

            let orgData: any;
            if (typeof orgDataRaw === 'string') {
                orgData = JSON.parse(orgDataRaw);
            } else {
                orgData = orgDataRaw;
            }

            console.log(`Nodes count: ${orgData.data.length}`);
            fs.writeFileSync('scripts/latest-chart-debug.json', JSON.stringify(orgData, null, 2));
            console.log("Dumped to scripts/latest-chart-debug.json");

            // Check for valid roots
            const nodes = orgData.data || [];
            // Check PIDs
            const nodeMap = new Map();
            nodes.forEach((n: any) => nodeMap.set(n.id, n));

            const roots: any[] = [];
            const orphans: any[] = [];

            nodes.forEach((n: any) => {
                if (!n.pid) {
                    roots.push(n);
                } else if (!nodeMap.has(n.pid)) {
                    // PID exists but points to nothing -> Orphan? 
                    // Or is it a Root if using Balkan logic?
                    // Balkan treats missing PID as Root usually.
                    orphans.push(n);
                }
            });

            console.log(`Explicit Roots (pid=null/undefined): ${roots.length}`);
            console.log(`Implicit Roots (pid missing from map): ${orphans.length}`);

            if (roots.length > 0) console.log("First explicit root:", roots[0]);
            if (orphans.length > 0) console.log("First implicit root:", orphans[0]);

            if (roots.length === 0 && orphans.length === 0 && nodes.length > 0) {
                console.warn("WARNING: CYCLIC OR BROKEN TREE (No roots found)!");
            }

            // Check tags
            if (nodes.length > 0) {
                console.log("First node tags:", nodes[0].tags, "Type:", typeof nodes[0].tags);
            }

        } catch (e) {
            console.error("Failed to parse org_data JSON", e);
            console.log("Raw org_data snippet:", String(chart.org_data).substring(0, 100));
        }

        pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

verify();
