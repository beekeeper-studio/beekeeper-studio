//npm install systeminformation os-utils 
// Install above packages to get the system information as well if required, and uncomment the below code and function
// const os = require('os');
// const si = require('systeminformation');

const mysql = require('mysql2/promise');

/**
 * Connects to a MySQL server and retrieves system performance metrics.
 * @param {object} config - MySQL connection configuration.
 * @returns {object} - An object containing MySQL server metrics.
 */
async function getMySQLMetrics(config) {
    try {
        // Establish connection
        const connection = await mysql.createConnection(config);

        // Query to fetch server metrics
        const [statusRows] = await connection.query('SHOW STATUS;');
        const [variablesRows] = await connection.query('SHOW VARIABLES;');

        // Extract specific metrics
        const status = Object.fromEntries(statusRows.map(row => [row.Variable_name, row.Value]));
        const variables = Object.fromEntries(variablesRows.map(row => [row.Variable_name, row.Value]));

        const metrics = {
            queryCache: {
                size: variables.query_cache_size || 'N/A',
                limit: variables.query_cache_limit || 'N/A',
                hits: status.Qcache_hits || 0,
                inserts: status.Qcache_inserts || 0,
                lowMemoryPrunes: status.Qcache_lowmem_prunes || 0,
            },
            performance: {
                connections: status.Connections || 0,
                uptime: status.Uptime || 0,
                threadsRunning: status.Threads_running || 0,
                threadsConnected: status.Threads_connected || 0,
                slowQueries: status.Slow_queries || 0,
            },
            ramUsage: {
                keyBufferSize: variables.key_buffer_size || 'N/A',
                innodbBufferPoolSize: variables.innodb_buffer_pool_size || 'N/A',
            },
        };

        // Close connection
        await connection.end();

        return metrics;
    } catch (error) {
        console.error('Error fetching MySQL metrics:', error.message);
        throw error;
    }
}


// /**
//  * Fetches server CPU, RAM, Swap, and Disk usage metrics
//  * @returns {Promise<object>} - Object containing system metrics
//  */
// async function getServerMetrics() {
//     try {
//         const cpuLoad = await si.currentLoad();
//         const memory = await si.mem();
//         const disk = await si.fsSize();

//         return {
//             cpu: {
//                 load: cpuLoad.currentLoad.toFixed(2), // CPU usage percentage
//             },
//             memory: {
//                 total: (memory.total / 1e9).toFixed(2) + ' GB', // Total memory in GB
//                 used: ((memory.active / memory.total) * 100).toFixed(2) + '%', // Used memory percentage
//             },
//             swap: {
//                 total: (memory.swaptotal / 1e9).toFixed(2) + ' GB', // Total swap in GB
//                 used: ((memory.swapused / memory.swaptotal) * 100).toFixed(2) + '%', // Used swap percentage
//             },
//             disk: disk.map(d => ({
//                 fs: d.fs,
//                 size: (d.size / 1e9).toFixed(2) + ' GB',
//                 used: ((d.used / d.size) * 100).toFixed(2) + '%',
//             })),
//         };
//     } catch (error) {
//         console.error('Error fetching server metrics:', error.message);
//         throw error;
//     }
// }

module.exports = {
    getMySQLMetrics,
    // getServerMetrics
};
