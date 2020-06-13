const RestaurantService = require("../services/restaurant.service");
const UserService = require("../services/user.service");
const { pick } = require("lodash");
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
      const { businessHours } = req.body;
      const restaurantData = pick(req.body, [
        "name",
        "city",
        "province",
        "postalCode",
        "cuisineType",
        "distance",
      ]);

      const newRestaurant = await RestaurantService.addRestaurant(
        restaurantData
      );

      await RestaurantService.addRestaurantHours(
        newRestaurant.id,
        businessHours
      );

      res.status(200).send(newRestaurant);
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
        "cuisineType",
      ]);

      const rows = await RestaurantService.getRestaurantsByFilters(
        userId,
        constraints,
        currentlyOpen
      );

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
        "cuisineType",
      ]);

      const result = await RestaurantService.updateRestaurant(
        restaurantId,
        updates
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
      const blackListResults = await RestaurantService.getUserBlackList(userId);

      // query favs without blacklisted restaurants
      const results = await RestaurantService.getUserFavourites(
        userId,
        blackListResults
      );

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
        RestaurantService.checkIfUserBlacklisted(userId, restaurantId),
        UserService.getUserById(userId),
        RestaurantService.getRestaurantById(restaurantId),
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
      const result = await RestaurantService.addRestaurantToFavourites(
        USER_ID,
        USERNAME,
        RESTAURANT_ID
      );

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

      const result = await RestaurantService.removeRestaurantFromFavourites(
        userId,
        restaurantId
      );

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

      const results = RestaurantService.getUserBlackList(userId);

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
          UserService.getUserById(userId),
          RestaurantService.getRestaurantById(restaurantId),
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
        const result = await RestaurantService.addRestaurantToBlackList(
          USER_ID,
          USERNAME,
          RESTAURANT_ID
        );

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

        const result = RestaurantService.removeRestaurantFromBlacklist(
          userId,
          restaurantId
        );

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
