/**
 * models/index.js
 *
 * Create new connection pool to DB.
 * Loads models by looking in every .js file in current dir
 * except for this file (index.js) and imports them into
 * Sequelize. If there is an association, pass the db object.
 */
const Sequelize = require("sequelize");
const fs = require("fs");
const path = require("path");

const basename = path.basename(__filename);
const db = {};

// Set up new connection
const sequelize = new Sequelize({
  host: "localhost",
  dialect: "postgres",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "resto-finder",
});

// Test connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

sequelize.sync({ alter: true });

module.exports = db;
