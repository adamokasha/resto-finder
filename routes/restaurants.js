const models = require("../models");
// console.log(models);

module.exports = (app) => {
  app.post("/restaurant", async (req, res) => {
    const { name, city, province, postalCode, country, cuisineType } = req.body;
    const result = await models.Restaurant.create({
      name,
      city,
      province,
      postalCode,
      country,
      cuisineType,
    });

    res.status(200).send(result);
  });
};
