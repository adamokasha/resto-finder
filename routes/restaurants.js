const models = require("../models");
const { pick } = require("lodash");
// console.log(models);

module.exports = (app) => {
  app.post("/restaurant", async (req, res) => {
    const {
      name,
      city,
      province,
      postalCode,
      country,
      cuisineType,
      distance,
    } = req.body;

    const result = await models.Restaurant.create({
      name,
      city,
      province,
      postalCode,
      country,
      cuisineType,
      distance,
    });

    res.status(200).send(result);
  });

  app.get("/restaurants", async (req, res) => {
    const constraints = pick(req.body, [
      "name",
      "distance",
      "city",
      "province",
      "postalCode",
      "country",
      "cuisineType",
    ]);

    const filters = { ...constraints };

    if (constraints.distance) {
      filters.distance = {
        [models.Sequelize.Op.lte]: parseInt(constraints.distance),
      };
    }

    const rows = await models.Restaurant.findAll({
      where: { ...filters },
    });

    return res.status(200).send(rows);
  });

  app.put("/restaurant", async (req, res) => {
    const updates = pick(req.body, [
      "name",
      "distance",
      "city",
      "province",
      "postalCode",
      "country",
      "cuisineType",
    ]);

    const restaurantId = req.body.id;

    const row = await models.Restaurant.update(
      { ...updates },
      {
        where: { id: restaurantId },
      }
    );

    res.status(200).send(row);
  });
};
