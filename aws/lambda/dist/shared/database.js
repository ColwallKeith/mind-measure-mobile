"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToRDS = connectToRDS;
exports.executeQuery = executeQuery;
exports.insertRecord = insertRecord;
exports.selectRecords = selectRecords;
exports.updateRecords = updateRecords;
const pg_1 = require("pg");
async function connectToRDS() {
    const config = {
        host: process.env.RDS_HOST,
        port: parseInt(process.env.RDS_PORT || '5432'),
        database: process.env.RDS_DATABASE,
        user: process.env.RDS_USERNAME,
        password: process.env.RDS_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000,
        query_timeout: 10000
    };
    const client = new pg_1.Client(config);
    try {
        await client.connect();
        console.log('✅ Connected to RDS PostgreSQL');
        return client;
    }
    catch (error) {
        console.error('❌ RDS connection failed:', error);
        throw new Error('Database connection failed');
    }
}
async function executeQuery(query, params = []) {
    const client = await connectToRDS();
    try {
        console.log('🔍 Executing query:', query.substring(0, 100) + '...');
        const result = await client.query(query, params);
        console.log(`✅ Query executed successfully, ${result.rowCount} rows affected`);
        return {
            rows: result.rows,
            rowCount: result.rowCount || 0
        };
    }
    catch (error) {
        console.error('❌ Query execution failed:', error);
        throw error;
    }
    finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }
}
async function insertRecord(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data).map((value, index) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        return value;
    });
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const columnList = columns.join(', ');
    const query = `
    INSERT INTO ${table} (${columnList})
    VALUES (${placeholders})
    RETURNING *
  `;
    const result = await executeQuery(query, values);
    return result.rows[0];
}
async function selectRecords(table, where = {}, orderBy, limit) {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map((key, index) => {
            params.push(where[key]);
            return `${key} = $${index + 1}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
        query += ` LIMIT ${limit}`;
    }
    const result = await executeQuery(query, params);
    return result.rows;
}
async function updateRecords(table, data, where) {
    const setClause = Object.keys(data).map((key, index) => {
        return `${key} = $${index + 1}`;
    }).join(', ');
    const whereClause = Object.keys(where).map((key, index) => {
        return `${key} = $${Object.keys(data).length + index + 1}`;
    }).join(' AND ');
    const query = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
  `;
    const params = [...Object.values(data), ...Object.values(where)];
    const result = await executeQuery(query, params);
    return result.rowCount;
}
