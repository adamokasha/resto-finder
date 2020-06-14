const {
  RestaurantController,
} = require("../controllers/restaurant.controller");
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

const restaurantController = new RestaurantController();

module.exports = (app) => {
  /**
   * POST /restaurant
   *
   * add a new restaurant to the database
   */
  app.post(
    "/restaurant",
    validate(addRestaurant),
    restaurantController.addRestaurant
  );

  /**
   * GET /restaurants
   *
   * Get a set of restaurant recommendations based on a set of passed in
   * filters.
   */
  app.get(
    "/restaurants",
    validate(getRestaurants),
    restaurantController.getRestaurantsByFilters
  );

  /**
   * PUT /restaurant
   *
   * Update an existing restaurant
   */
  app.put(
    "/restaurant",
    validate(updateRestaurant),
    restaurantController.updateRestaurant
  );

  /**
   * GET /favourites
   *
   * Get a user's favourites list
   */
  app.get(
    "/favourites",
    validate(getFavourites),
    restaurantController.getUserFavourites
  );

  /**
   * POST /favourites
   *
   * Add a restaurant to favourites
   */
  app.post(
    "/favourites",
    validate(addOrRemoveFavourite),
    restaurantController.addRestaurantToFavourites
  );

  /**
   * DELETE /unfavourite
   *
   * Remove a restaurant from favourites
   */
  app.delete(
    "/unfavourite",
    validate(addOrRemoveFavourite),
    restaurantController.removeRestaurantFromFavourites
  );

  /**
   * GET /blacklist
   *
   * Get user's blacklist
   */
  app.get(
    "/blacklist",
    validate(getBlackList),
    restaurantController.getUserBlackList
  );

  /**
   * POST /blacklist
   *
   * Add a restaurant to blacklist
   */
  app.post(
    "/blacklist",
    validate(addOrRemoveFromBlacklist),
    restaurantController.addRestaurantToBlacklist
  );

  /**
   * DELETE /unblacklist
   *
   * Remove a restaurant from blacklist
   */
  app.delete(
    "/unblacklist",
    validate(addOrRemoveFromBlacklist),
    restaurantController.removeRestaurantFromBlacklist
  );
};
