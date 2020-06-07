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
    const { currentlyOpen, userId } = req.body;
    const constraints = pick(req.body, [
      "name",
      "distance",
      "city",
      "province",
      "postalCode",
      "country",
      "cuisineType",
    ]);

    const filters = {
      ...constraints,
    };

    if (constraints.distance) {
      filters.distance = {
        [models.Sequelize.Op.lte]: parseInt(constraints.distance),
      };
    }

    // Get user's blacklist to exclude from results
    const userBlacklist = await models.Blacklist.findAll({
      where: { UserId: userId },
    }).map((row) => row.RestaurantId);

    const query = {
      where: {
        ...filters,
        "$Blacklisted.RestaurantId$": {
          [models.Sequelize.Op.notIn]: userBlacklist,
        },
      },
      include: [
        {
          model: models.Blacklist,
          as: "Blacklisted",
          attributes: ["RestaurantId"],
          required: false,
        },
      ],
    };

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

      query.include.push({
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
      });
    }
    console.log("\n");
    console.log("QUERY", JSON.stringify(query));
    console.log("\n");

    // return res.send(query);

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

  app.get("/favourites", async (req, res) => {
    try {
      const { userId } = req.body;

      const results = await models.Favourite.findAll({
        where: {
          UserId: userId,
        },
      });

      return res.status(200).send({ results });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error." });
    }
  });

  app.post("/favourites", async (req, res) => {
    try {
      const { restaurantId, userId } = req.body;

      const verificationPromises = [
        models.User.findAll({ where: { id: userId } }),
        models.Restaurant.findAll({ where: { id: restaurantId } }),
      ];

      const [userResults, restaurantResults] = await Promise.all(
        verificationPromises
      );

      const userExists = userResults.length;
      const restaurantExists = restaurantResults.length;

      if (!userExists || !restaurantExists) {
        return res.status(400).send({
          message: {
            userExists,
            restaurantExists,
          },
        });
      }

      const username = userResults[0].username;
      const result = await models.Favourite.findOrCreate({
        where: {
          username,
          RestaurantId: restaurantId,
          UserId: userId,
        },
      });

      if (!result[1]) {
        return res.status(200).send({ message: "Already favourited!" });
      }

      const restaurantName = restaurantResults[0].name;
      res.status(200).send({ message: `Added restaurant: ${restaurantName}` });
    } catch (e) {
      console.log(e);

      res.status(500).send({ message: "Internal Server Error." });
    }
  });

  app.delete("/unfavourite", async (req, res) => {
    const { userId, restaurantId } = req.body;

    const result = await models.Favourite.destroy({
      where: {
        UserId: userId,
        RestaurantId: restaurantId,
      },
    });

    if (result === 0) {
      return res
        .status(400)
        .send({ message: `Restaurant was not in favourites.` });
    }

    res.status(200).send({ message: `Successfully unfavourited restaurant.` });
  });

  app.get("/blacklist", async (req, res) => {
    try {
      const { userId } = req.body;

      const results = await models.Blacklist.findAll({
        where: { UserId: { [models.Sequelize.Op.eq]: parseInt(userId) } },
      });

      res.status(200).send({ results });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.post("/blacklist", async (req, res) => {
    try {
      const { userId, restaurantId } = req.body;

      const verificationPromises = [
        models.User.findAll({ where: { id: userId } }),
        models.Restaurant.findAll({ where: { id: restaurantId } }),
      ];

      const [userResults, restaurantResults] = await Promise.all(
        verificationPromises
      );

      const userExists = userResults.length;
      const restaurantExists = restaurantResults.length;

      if (!userExists || !restaurantExists) {
        return res.status(400).send({
          message: {
            userExists,
            restaurantExists,
          },
        });
      }

      const username = userResults[0].username;
      const result = await models.Blacklist.findOrCreate({
        where: {
          username,
          RestaurantId: restaurantId,
          UserId: userId,
        },
      });

      if (!result[1]) {
        return res.status(200).send({ message: "Already blacklisted!" });
      }

      const restaurantName = restaurantResults[0].name;
      res
        .status(200)
        .send({ message: `Added restaurant to blacklist: ${restaurantName}` });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.delete("/unblacklist", async (req, res) => {
    try {
      const { userId, restaurantId } = req.body;

      const result = await models.Blacklist.destroy({
        where: {
          UserId: userId,
          RestaurantId: restaurantId,
        },
      });

      if (result === 0) {
        return res
          .status(400)
          .send({ message: `Restaurant was not in blacklist.` });
      }

      res.status(200).send({
        message: `Successfully unblacklisted restaurant. The owners are relieved.`,
      });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error" });
    }
  });
};
