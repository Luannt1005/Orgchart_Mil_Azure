
import sql from 'mssql';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // For Azure SQL
        trustServerCertificate: false // Change to true for local dev / self-signed certs
    }
};

let pool: sql.ConnectionPool | null = null;

export async function getDbConnection() {
    if (pool) return pool;
    try {
        pool = await sql.connect(config);
        return pool;
    } catch (err) {
        console.error('Database connection failed: ', err);
        throw err;
    }
}

export { sql };
