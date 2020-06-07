const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5050;

// Middleware to parse incoming JSON
app.use(bodyParser.json());

require("./routes/restaurants")(app);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
