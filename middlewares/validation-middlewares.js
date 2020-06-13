const { check, param, validationResult } = require("express-validator");
const { PROVINCES } = require("../constants");

// Add common param validation checks to keep code DRY
const COMMON_PARAMS = {
  name: check("name")
    .isString()
    .isLength({ min: 1, max: 255 })
    .not()
    .isEmpty()
    .trim()
    .escape(),
  cuisineType: check("cuisineType")
    .isString()
    .isLength({ min: 1, max: 255 })
    .trim()
    .escape(),
  distance: check("distance").isNumeric().trim().escape(),
  city: check("city").isString().isLength({ min: 1, max: 255 }).trim().escape(),
  province: check("province").isString().isIn(PROVINCES),
  postalCode: check("postalCode")
    .isString()
    .isLength({ min: 3, max: 7 })
    .not()
    .isEmpty()
    .trim()
    .escape(),
  restaurantId: check("restaurantId")
    .not()
    .isEmpty()
    .isInt()
    .isLength({ min: 1, max: 255 }),
  userId: check("userId")
    .not()
    .isEmpty()
    .isInt()
    .isLength({ min: 1, max: 255 }),
};

module.exports = {
  addUser: [
    check("username").isEmail().normalizeEmail().not().isEmpty(),
    check("firstName").isString().not().isEmpty().trim().escape(),
    check("lastName").isString().not().isEmpty().trim().escape(),
    COMMON_PARAMS.city,
    COMMON_PARAMS.province,
  ],

  getUser: [
    param("id").isString().isLength({ min: 1, max: 255 }).isNumeric(),
    //   .custom((value) => /^\d+$/.test(value)),
  ],

  addRestaurant: [
    COMMON_PARAMS.name,
    COMMON_PARAMS.city,
    COMMON_PARAMS.province,
    COMMON_PARAMS.postalCode,
    COMMON_PARAMS.cuisineType,
    COMMON_PARAMS.distance,
    check("businessHours").isArray({ min: 7, max: 7 }).not().isEmpty(),
  ],

  getRestaurants: [
    COMMON_PARAMS.userId,
    COMMON_PARAMS.name.optional(),
    COMMON_PARAMS.cuisineType.optional(),
    COMMON_PARAMS.distance.optional(),
    COMMON_PARAMS.city.optional(),
    COMMON_PARAMS.province.optional(),
    COMMON_PARAMS.postalCode.optional(),
    check("currentlyOpen").optional().isNumeric().isIn(["0", "1"]),
  ],

  updateRestaurant: [
    check("id").isInt(),
    COMMON_PARAMS.name.optional(),
    COMMON_PARAMS.cuisineType.optional(),
    COMMON_PARAMS.distance.optional(),
    COMMON_PARAMS.city.optional(),
    COMMON_PARAMS.province.optional(),
    COMMON_PARAMS.postalCode.optional(),
  ],

  getFavourites: [COMMON_PARAMS.userId],

  addOrRemoveFavourite: [COMMON_PARAMS.userId, COMMON_PARAMS.restaurantId],

  getBlackList: [COMMON_PARAMS.userId],

  addOrRemoveFromBlacklist: [COMMON_PARAMS.userId, COMMON_PARAMS.restaurantId],

  validate: (validations) => async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(422).json({ errors: errors.array() });
  },
};
