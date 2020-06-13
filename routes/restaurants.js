const { restaurantService } = require("../services/restaurant.service");
const { userService } = require("../services/user.service");
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
  app.post("/restaurant", validate(addRestaurant), async (req, res) => {
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

      const newRestaurant = await restaurantService.addRestaurant(
        restaurantData
      );

      await restaurantService.addRestaurantHours(
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
  app.get("/restaurants", validate(getRestaurants), async (req, res) => {
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

      const rows = await restaurantService.getRestaurantsByFilters(
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
  app.put("/restaurant", validate(updateRestaurant), async (req, res) => {
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

      const result = await restaurantService.updateRestaurant(
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
  app.get("/favourites", validate(getFavourites), async (req, res) => {
    try {
      const { userId } = req.body;

      // Get blacklisted restaurants
      const blackListResults = await restaurantService.getUserBlackList(userId);

      // query favs without blacklisted restaurants
      const results = await restaurantService.getUserFavourites(
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
  app.post("/favourites", validate(addOrRemoveFavourite), async (req, res) => {
    try {
      const { restaurantId, userId } = req.body;

      const verificationPromises = [
        restaurantService.checkIfUserBlacklisted(userId, restaurantId),
        userService.getUserById(userId),
        restaurantService.getRestaurantById(restaurantId),
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
      const result = await restaurantService.addRestaurantToFavourites(
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
    validate(addOrRemoveFavourite),
    async (req, res) => {
      const { userId, restaurantId } = req.body;

      const result = await restaurantService.removeRestaurantFromFavourites(
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
  app.get("/blacklist", validate(getBlackList), async (req, res) => {
    try {
      const { userId } = req.body;

      const results = restaurantService.getUserBlackList(userId);

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
    validate(addOrRemoveFromBlacklist),
    async (req, res) => {
      try {
        const { userId, restaurantId } = req.body;

        const verificationPromises = [
          userService.getUserById(userId),
          restaurantService.getRestaurantById(restaurantId),
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
        const result = await restaurantService.addRestaurantToBlackList(
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
    validate(addOrRemoveFromBlacklist),
    async (req, res) => {
      try {
        const { userId, restaurantId } = req.body;

        const result = restaurantService.removeRestaurantFromBlacklist(
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
