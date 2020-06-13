const {
  Restaurant,
  BusinessHours,
  Blacklist,
  Favourite,
  Sequelize,
} = require("../models");
const { assign } = require("lodash");

class RestaurantService {
  constructor(
    restaurantModel,
    businessHoursModel,
    favouriteModel,
    blacklistModel,
    sequelize
  ) {
    this.Restaurant = restaurantModel;
    this.BusinessHours = businessHoursModel;
    this.Favourite = favouriteModel;
    this.Blacklist = blacklistModel;
    this.Sequelize = sequelize;
  }

  /**
   * addRestaurant
   *
   * Add a restaurant to the database
   *
   * @param {object} newRestaurantData
   */
  async addRestaurant(newRestaurantData) {
    return await this.Restaurant.create({
      ...newRestaurantData,
      country: "Canada",
    });
  }

  /**
   * addRestaurantHours
   *
   * Add business hours rows for a restaurant
   *
   * @param {string} restaurantId
   * @param {Array.<string[]>} businessHoursData
   */
  async addRestaurantHours(restaurantId, businessHoursData) {
    const businessHoursBatch = businessHoursData
      .slice(0, 7)
      .map((hoursData, i) => ({
        RestaurantId: restaurantId,
        day: i,
        open: hoursData[0],
        close: hoursData[1],
      }));

    await this.BusinessHours.bulkCreate(businessHoursBatch);
  }

  /**
   * getRestaurantById
   *
   * @param {number | string} restaurantId
   */
  async getRestaurantById(restaurantId) {
    return await this.Restaurant.findAll({
      where: { id: { [this.Sequelize.Op.eq]: restaurantId } },
    });
  }

  /**
   * getRestaurantsByFilters
   *
   * Get restaurant recommendation by a set of filters.
   *
   * @param {string | number} userId
   * @param {object} constraints
   * @param {1 | 0} currentlyOpen
   */
  async getRestaurantsByFilters(userId, constraints, currentlyOpen) {
    let iLikeFilters = {};
    // Iterate over filters that should be iLike query and add to iLikeFilters
    ["name", "city", "postalCode", "cuisineType"]
      .map((filterName) => {
        if (constraints[filterName]) {
          return {
            [filterName]: {
              [this.Sequelize.Op.iLike]: `%${constraints[filterName]}%`,
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
        [this.Sequelize.Op.gte]: parseInt(constraints.distance),
      };
    }

    if (constraints.province) {
      filters.province = {
        [this.Sequelize.Op.eq]: constraints.province,
      };
    }

    // Get user's blacklist to exclude from results
    const userBlacklist = await Blacklist.findAll({
      where: { UserId: { [this.Sequelize.Op.eq]: userId } },
    }).map((row) => row.RestaurantId);

    // build final query object
    const query = {
      where: {
        ...filters,
        "$Blacklisted.RestaurantId$": {
          [this.Sequelize.Op.or]: [
            { [this.Sequelize.Op.notIn]: userBlacklist },
            { [this.Sequelize.Op.eq]: null },
          ],
        },
      },
      include: [
        {
          model: this.Blacklist,
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
        model: this.BusinessHours,
        where: {
          day,
          open: {
            [this.Sequelize.Op.lte]: TIME,
          },
          close: {
            [this.Sequelize.Op.gte]: TIME,
          },
        },
      });
    }

    return await Restaurant.findAll(query);
  }

  /**
   * updateRestaurant
   *
   * Update an existing restaurant
   *
   * @param {string | number} restaurantId
   * @param {object} updates
   */
  async updateRestaurant(restaurantId, updates) {
    return await Restaurant.update(
      { ...updates },
      {
        where: { id: { [this.Sequelize.Op.eq]: restaurantId } },
      }
    );
  }

  /**
   * getUserFavourites
   *
   * Get user's favourites exclusive of blacklisted restaurants
   *
   * @param {string | number} userId
   * @param {Array} userBlacklist
   */
  async getUserFavourites(userId, userBlacklist) {
    return await this.Favourite.findAll({
      where: {
        UserId: { [this.Sequelize.Op.eq]: userId },
        RestaurantId: { [this.Sequelize.Op.notIn]: userBlacklist },
      },
      include: {
        model: this.Restaurant,
      },
    });
  }

  /**
   *
   * addRestaurantToFavourites
   *
   * Add a restaurants to user faves
   *
   * @param {string | number} userId
   * @param {string} username
   * @param {string | number} restaurantId
   */
  async addRestaurantToFavourites(userId, username, restaurantId) {
    return await this.Favourite.findOrCreate({
      where: {
        username,
        RestaurantId: restaurantId,
        UserId: userId,
      },
    });
  }

  /**
   *
   * removeRestaurantFromFavourites
   *
   * Remove a restaurant from user faves
   *
   * @param {string | number} userId
   * @param {string | number} restaurantId
   */
  async removeRestaurantFromFavourites(userId, restaurantId) {
    return await this.Favourite.destroy({
      where: {
        UserId: { [this.Sequelize.Op.eq]: userId },
        RestaurantId: { [this.Sequelize.Op.eq]: restaurantId },
      },
    });
  }

  /**
   * getUserBlackList
   *
   * Get a user's list of current blacklisted restaurants
   *
   * @param {string | number} userId
   */
  async getUserBlackList(userId) {
    return await Blacklist.findAll({
      where: {
        UserId: { [this.Sequelize.Op.eq]: userId },
      },
    });
  }

  /**
   * checkIfUserBlacklisted
   *
   * Check if a restaurant is in user's blacklist
   *
   * @param {string | number} userId
   * @param {string | number} restaurantId
   */
  async checkIfUserBlacklisted(userId, restaurantId) {
    return await Blacklist.findAll({
      where: {
        UserId: { [this.Sequelize.Op.eq]: userId },
        RestaurantId: { [this.Sequelize.Op.eq]: restaurantId },
      },
    });
  }

  /**
   * addRestaurantToBlackList
   *
   * Add a restaurant to a user's blacklist
   *
   * @param {string| number} userId
   * @param {string} username
   * @param {string | number} restaurantId
   */
  async addRestaurantToBlackList(userId, username, restaurantId) {
    return await this.Blacklist.findOrCreate({
      where: {
        username,
        RestaurantId: restaurantId,
        UserId: userId,
      },
    });
  }

  /**
   * removeRestaurantFromBlacklist
   *
   * Remove a restaurant from a user's blacklist
   *
   * @param {string | number} userId
   * @param {string | number} restaurantId
   */
  async removeRestaurantFromBlacklist(userId, restaurantId) {
    return await this.Blacklist.destroy({
      where: {
        UserId: { [this.Sequelize.Op.eq]: userId },
        RestaurantId: { [this.Sequelize.Op.eq]: restaurantId },
      },
    });
  }
}

module.exports = {
  restaurantService: new RestaurantService(
    Restaurant,
    BusinessHours,
    Favourite,
    Blacklist,
    Sequelize
  ),
  RestaurantService,
};
