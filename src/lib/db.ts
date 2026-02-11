
import sql from 'mssql';

const dbServer = process.env.DB_SERVER || '';
const dbUser = process.env.DB_USER || '';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || '';

// Handle port if included in DB_SERVER (e.g., myserver.database.windows.net,1433)
let server = dbServer;
let port = 1433;

if (dbServer.includes(',')) {
    const parts = dbServer.split(',');
    server = parts[0];
    port = parseInt(parts[1]);
} else if (dbServer.includes(':')) {
    const parts = dbServer.split(':');
    server = parts[0];
    port = parseInt(parts[1]);
}

console.log(`[DB Config] Server: ${server}, Port: ${port}, User: ${dbUser ? '***' : 'missing'}, DB: ${dbName}`);

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: server,
    port: port,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // For Azure SQL
        trustServerCertificate: true, // Change to true for local dev / self-signed certs
        connectTimeout: 30000, // 30 seconds
        requestTimeout: 30000 // 30 seconds
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool: sql.ConnectionPool | null = null;

export async function getDbConnection() {
    if (pool) {
        if (!pool.connected) {
            console.log('Pool not connected, reconnecting...');
            pool = null;
        } else {
            return pool;
        }
    }

    try {
        console.log(`Connecting to database ${dbName} at ${server}...`);
        pool = await sql.connect(config);
        console.log('Database connected successfully.');
        return pool;
    } catch (err: any) {
        console.error('Database connection failed:', err.message);
        console.error('Connection config:', {
            server,
            database: dbName,
            user: dbUser ? '***' : 'missing',
            encrypt: config.options.encrypt
        });
        throw err;
    }
}

export { sql };
