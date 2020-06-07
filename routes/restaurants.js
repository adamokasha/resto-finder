const models = require("../models");
const { pick } = require("lodash");

module.exports = (app) => {
  // TODO: validation, error handling
  app.post("/restaurant", async (req, res) => {
    const {
      name,
      city,
      province,
      postalCode,
      country,
      cuisineType,
      distance,
      businessHours,
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

    const businessHoursBatch = businessHours
      .slice(0, 7)
      .map((hoursData, i) => ({
        RestaurantId: result.id,
        day: i,
        open: hoursData[0],
        close: hoursData[1],
      }));

    await models.BusinessHours.bulkCreate(businessHoursBatch);

    res.status(200).send(result);
  });

  app.get("/restaurants", async (req, res) => {
    const { currentlyOpen } = req.body;
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

    const query = { where: { ...filters } };
    console.log(parseInt(currentlyOpen));
    if (parseInt(currentlyOpen)) {
      // Build sql-like TIME string
      const now = new Date();
      const day = now.getDay();
      // const day = 6;
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const TIME = `${hours}:${minutes}:${seconds}`;
      // const TIME = "21:00:00";

      query.include = {
        model: models.BusinessHours,
        where: {
          day,
          open: {
            [models.Sequelize.Op.lte]: TIME,
          },
          close: {
            [models.Sequelize.Op.gte]: TIME,
          },
        },
      };
    }

    const rows = await models.Restaurant.findAll(query);

    return res.status(200).send(rows);
  });

  // TODO: validation, error handling
  app.put("/restaurant", async (req, res) => {
    const restaurantId = req.body.id;
    const updates = pick(req.body, [
      "name",
      "distance",
      "city",
      "province",
      "postalCode",
      "country",
      "cuisineType",
    ]);

    const row = await models.Restaurant.update(
      { ...updates },
      {
        where: { id: restaurantId },
      }
    );

    res.status(200).send(row);
  });
};
