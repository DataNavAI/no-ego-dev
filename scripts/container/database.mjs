import {openNedDatabase} from '../../src/database.js';
const db = openNedDatabase({databaseUrl:process.env.NED_DATABASE_URL});
db.close();
