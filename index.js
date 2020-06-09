require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT;

// Middleware to parse incoming JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require("./routes/restaurants")(app);
require("./routes/users")(app);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
