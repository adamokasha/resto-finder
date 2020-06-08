const models = require("../models");
const { pick, assign } = require("lodash");

module.exports = (app) => {
  // TODO: validation, error handling
  app.post("/restaurant", async (req, res) => {
    try {
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
    } catch (e) {
      console.error(e);

      return res.status(500).send({ message: "Internal Server Error." });
    }
  });

  app.get("/restaurants", async (req, res) => {
    try {
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

      let iLikeFilters = {};
      // Iterate over filters that should be iLike query and add to iLikeFilters
      ["name", "city", "province", "postalCode", "country", "cuisineType"]
        .map((filterName) => {
          if (constraints[filterName]) {
            return {
              [filterName]: {
                [models.Sequelize.Op.iLike]: `%${constraints[filterName]}%`,
              },
            };
          }
          return null;
        })
        .forEach((constraint) => {
          if (constraint !== null) {
            iLikeFilters = assign(constraint, iLikeFilters);
          }
        });

      // spread iLikeFilters
      const filters = {
        ...iLikeFilters,
      };

      // Add distance constraint to filters if needed
      if (constraints.distance) {
        filters.distance = {
          [models.Sequelize.Op.gte]: parseInt(constraints.distance),
        };
      }

      // Get user's blacklist to exclude from results
      const userBlacklist = await models.Blacklist.findAll({
        where: { UserId: userId },
      }).map((row) => row.RestaurantId);

      // build final query object
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

      // If currentlyOpen param passed in, need to pass additional filters from BusinessHours table
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

      const rows = await models.Restaurant.findAll(query);

      return res.status(200).send(rows);
    } catch (e) {
      console.error(e);

      return res.status(500).send({ message: "Internal Server Error." });
    }
  });

  // TODO: validation, error handling
  app.put("/restaurant", async (req, res) => {
    try {
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

      await models.Restaurant.update(
        { ...updates },
        {
          where: { id: { [models.Sequelize.Op.eq]: restaurantId } },
        }
      );

      res.status(200).send({ message: "Update successful" });
    } catch (e) {
      console.error(e);

      return res.status(500).send({ message: "Internal Server Error." });
    }
  });

  app.get("/favourites", async (req, res) => {
    try {
      const { userId } = req.body;

      const results = await models.Favourite.findAll({
        where: {
          UserId: { [models.Sequelize.Op.eq]: userId },
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
        models.Blacklist.findAll({
          where: { RestaurantId: { [models.Sequelize.Op.eq]: restaurantId } },
        }),
        models.User.findAll({
          where: { id: { [models.Sequelize.Op.eq]: userId } },
        }),
        models.Restaurant.findAll({
          where: { id: { [models.Sequelize.Op.eq]: restaurantId } },
        }),
      ];

      const [
        blacklistResults,
        userResults,
        restaurantResults,
      ] = await Promise.all(verificationPromises);

      if (blacklistResults.length) {
        return res
          .status(400)
          .send({ message: "Cannot favourite a blacklisted restaurant!" });
      }

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

      // Avoid querying with user input since findOrCreate does not allow Sequelize.Op
      const USERNAME = userResults[0].username;
      const RESTAURANT_ID = restaurantResults[0].id;
      const USER_ID = userResults[0].id;
      const result = await models.Favourite.findOrCreate({
        where: {
          username: USERNAME,
          RestaurantId: RESTAURANT_ID,
          UserId: USER_ID,
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
        UserId: { [models.Sequelize.Op.eq]: userId },
        RestaurantId: { [models.Sequelize.Op.eq]: restaurantId },
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
        models.User.findAll({
          where: { id: { [models.Sequelize.Op.eq]: userId } },
        }),
        models.Restaurant.findAll({
          where: { id: { [models.Sequelize.Op.eq]: restaurantId } },
        }),
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

      // Avoid querying with user input since findOrCreate does not allow Sequelize.Op
      const USERNAME = userResults[0].username;
      const RESTAURANT_ID = restaurantResults[0].id;
      const USER_ID = userResults[0].id;
      const result = await models.Blacklist.findOrCreate({
        where: {
          username: USERNAME,
          RestaurantId: RESTAURANT_ID,
          UserId: USER_ID,
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
          UserId: { [models.Sequelize.Op.eq]: userId },
          RestaurantId: { [models.Sequelize.Op.eq]: restaurantId },
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
