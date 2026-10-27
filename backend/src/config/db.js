// src/config/db.js
// Knex instance configuration for the backend API
// Loads connection settings from environment variables (as defined in .env.example)
// and falls back to defaults from knexfile.js.

const knexConfig = require('../../knexfile'); // knexfile is at project root
const knex = require('knex')(knexConfig);

module.exports = { knex };
