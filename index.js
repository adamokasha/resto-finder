const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5050;

// Middleware to parse incoming JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require("./routes/restaurants")(app);
require("./routes/users")(app);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
