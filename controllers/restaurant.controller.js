const { RestaurantService } = require("../services/restaurant.service");
const { UserService } = require("../services/user.service");
const {
  User,
  Restaurant,
  BusinessHours,
  Favourite,
  Blacklist,
  Sequelize,
} = require("../models");
const { pick } = require("lodash");
const autoBind = require("auto-bind");

class RestaurantController {
  constructor() {
    this.restaurantService = new RestaurantService(
      Restaurant,
      BusinessHours,
      Favourite,
      Blacklist,
      Sequelize
    );
    this.userService = new UserService(User, Sequelize);

    // bind methods
    autoBind(this);
  }

  /**
   * addRestaurant
   *
   * Add a restaurant to the database
   *
   * @param {Request} req
   * @param {Response} res
   */
  async addRestaurant(req, res) {
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

      const newRestaurant = await this.restaurantService.addRestaurant(
        restaurantData
      );

      await this.restaurantService.addRestaurantHours(
        newRestaurant.id,
        businessHours
      );

      res.status(200).send(newRestaurant);
    } catch (e) {
      console.error(e);

      return res.status(500).send({ message: "Internal Server Error." });
    }
  }

  /**
   * getRestaurantsByFilters
   *
   * Get a list of restaurant recommendations based on filters
   *
   * @param {Request} req
   * @param {Response} res
   */
  async getRestaurantsByFilters(req, res) {
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

      const rows = await this.restaurantService.getRestaurantsByFilters(
        userId,
        constraints,
        currentlyOpen
      );

      return res.status(200).send(rows);
    } catch (e) {
      console.error(e);

      return res.status(500).send({ message: "Internal Server Error." });
    }
  }

  /**
   * updateRestaurant
   *
   * Update a restaurant
   *
   * @param {Request} req
   * @param {Response} res
   */
  async updateRestaurant(req, res) {
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

      const result = await this.restaurantService.updateRestaurant(
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
  }

  /**
   * getUserFavourites
   *
   * Get a list of the user's favourite restaurants
   * @param {Request} req
   * @param {Response} res
   */
  async getUserFavourites(req, res) {
    try {
      const { userId } = req.body;

      // Get blacklisted restaurants
      const blackListResults = await this.restaurantService.getUserBlackList(
        userId
      );

      // map blacklisted restaurant ids to array
      const blackListIds = blackListResults.map((blackList) => blackList.id);

      // query favs without blacklisted restaurants
      const results = await this.restaurantService.getUserFavourites(
        userId,
        blackListIds
      );

      return res.status(200).send({ results });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error." });
    }
  }

  /**
   * addRestaurantToFavourites
   *
   * Add a restaurant to a user's faves
   *
   * @param {Request} req
   * @param {Response} res
   */
  async addRestaurantToFavourites(req, res) {
    try {
      const { restaurantId, userId } = req.body;

      const verificationPromises = [
        this.restaurantService.checkIfUserBlacklisted(userId, restaurantId),
        this.userService.getUserById(userId),
        this.restaurantService.getRestaurantById(restaurantId),
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
      const result = await this.restaurantService.addRestaurantToFavourites(
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
  }

  /**
   * removeRestaurantFromFavourites
   *
   * Remove a restaurant from user faves
   *
   * @param {Request} req
   * @param {Response} res
   */
  async removeRestaurantFromFavourites(req, res) {
    try {
      const { userId, restaurantId } = req.body;

      const result = await this.restaurantService.removeRestaurantFromFavourites(
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
    } catch (e) {
      console.log(e);

      res.status(500).send({ message: "Internal Server Error." });
    }
  }

  /**
   * getUserBlackList
   *
   * Get a list of the user's blacklisted restaurants
   *
   * @param {Request} req
   * @param {Response} res
   */
  async getUserBlackList(req, res) {
    try {
      const { userId } = req.body;

      const results = await this.restaurantService.getUserBlackList(userId);

      res.status(200).send({ results });
    } catch (e) {
      console.error(e);

      res.status(500).send({ message: "Internal Server Error" });
    }
  }

  /**
   * addRestaurantToBlacklist
   *
   * Add a restaurant to a user's blacklist
   *
   * @param {Request} req
   * @param {Response} res
   */
  async addRestaurantToBlacklist(req, res) {
    try {
      const { userId, restaurantId } = req.body;

      const verificationPromises = [
        this.userService.getUserById(userId),
        this.restaurantService.getRestaurantById(restaurantId),
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
      const result = await this.restaurantService.addRestaurantToBlackList(
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

  /**
   * removeRestaurantFromBlacklist
   *
   * Remove a restaurant from a user's blacklist
   * @param {Request} req
   * @param {Response} res
   */
  async removeRestaurantFromBlacklist(req, res) {
    try {
      const { userId, restaurantId } = req.body;

      const result = await this.restaurantService.removeRestaurantFromBlacklist(
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
}

module.exports = { RestaurantController };
