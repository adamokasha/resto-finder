const models = require("../models");
const { pick, assign } = require("lodash");
const {
  addRestaurant,
  getRestaurants,
  updateRestaurant,
  getFavourites,
  addOrRemoveFavourite,
  getBlackList,
  addOrRemoveFromBlacklist,
  validate,
} = require("../middlewares/validation-middlewares");

module.exports = (app) => {
  /**
   * POST /restaurant
   *
   * add a new restaurant to the database
   */
  app.post("/restaurant", addRestaurant, validate, async (req, res) => {
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

  /**
   * GET /restaurants
   *
   * Get a set of restaurant recommendations based on a set of passed in
   * filters.
   */
  app.get("/restaurants", getRestaurants, validate, async (req, res) => {
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
      ["name", "city", "postalCode", "country", "cuisineType"]
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

      if (constraints.province) {
        filters.province = {
          [models.Sequelize.Op.eq]: constraints.province,
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

  /**
   * PUT /restaurant
   *
   * Update an existing restaurant
   */
  app.put("/restaurant", updateRestaurant, validate, async (req, res) => {
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

      const result = await models.Restaurant.update(
        { ...updates },
        {
          where: { id: { [models.Sequelize.Op.eq]: restaurantId } },
        }
      );

      if (!result[0]) {
        return res
          .status(404)
          .send({ message: `Restaurant with ${restaurantId} not found.` });
      }

      res.status(200).send({ message: "Update successful" });
    } catch (e) {
      console.error(e);

      return res.status(500).send({ message: "Internal Server Error." });
    }
  });

  /**
   * GET /favourites
   *
   * Get a user's favourites list
   */
  app.get("/favourites", getFavourites, validate, async (req, res) => {
    try {
      const { userId } = req.body;

      // Get blacklisted restaurants
      const blackListResults = await models.Blacklist.findAll({
        where: {
          UserId: { [models.Sequelize.Op.eq]: userId },
        },
      }).map((blacklistItem) => blacklistItem.RestaurantId);

      // query favs without blacklisted restaurants
      const results = await models.Favourite.findAll({
        where: {
          UserId: { [models.Sequelize.Op.eq]: userId },
          RestaurantId: { [models.Sequelize.Op.notIn]: blackListResults },
        },
        include: {
          model: models.Restaurant,
        },
      });

      return res.status(200).send({ results });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error." });
    }
  });

  /**
   * POST /favourites
   *
   * Add a restaurant to favourites
   */
  app.post("/favourites", addOrRemoveFavourite, validate, async (req, res) => {
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

  /**
   * DELETE /unfavourite
   *
   * Remove a restaurant from favourites
   */
  app.delete(
    "/unfavourite",
    addOrRemoveFavourite,
    validate,
    async (req, res) => {
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

      res
        .status(200)
        .send({ message: `Successfully unfavourited restaurant.` });
    }
  );

  /**
   * GET /blacklist
   *
   * Get user's blacklist
   */
  app.get("/blacklist", getBlackList, validate, async (req, res) => {
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

  /**
   * POST /blacklist
   *
   * Add a restaurant to blacklist
   */
  app.post(
    "/blacklist",
    addOrRemoveFromBlacklist,
    validate,
    async (req, res) => {
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
        res.status(200).send({
          message: `Added restaurant to blacklist: ${restaurantName}`,
        });
      } catch (e) {
        console.error(e);

        res.status(500).send({ message: "Internal Server Error" });
      }
    }
  );

  /**
   * DELETE /unblacklist
   *
   * Remove a restaurant from blacklist
   */
  app.delete(
    "/unblacklist",
    addOrRemoveFromBlacklist,
    validate,
    async (req, res) => {
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
    }
  );
};
