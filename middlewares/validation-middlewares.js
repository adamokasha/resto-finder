const { check, param, validationResult } = require("express-validator");

module.exports = {
  addUser: [
    check("username").isEmail().normalizeEmail().not().isEmpty(),
    check("firstName").isString().not().isEmpty().trim().escape(),
    check("lastName").isString().not().isEmpty().trim().escape(),
    check("city").isString().not().isEmpty().trim().escape(),
    check("province")
      .isString()
      .isLength({ min: 2, max: 2 })
      .not()
      .isEmpty()
      .isIn([
        "AB",
        "BC",
        "MB",
        "NB",
        "NL",
        "NT",
        "NS",
        "NU",
        "ON",
        "PE",
        "QC",
        "SK",
        "YT",
      ]),
  ],

  getUser: [
    param("id").isString().isLength({ min: 1, max: 255 }).isNumeric(),
    //   .custom((value) => /^\d+$/.test(value)),
  ],

  addRestaurant: [
    check("name")
      .isString()
      .isLength({ min: 1, max: 255 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("city")
      .isString()
      .isLength({ min: 1, max: 255 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("province")
      .isString({ min: 2, max: 2 })
      .not()
      .isEmpty()
      .isIn([
        "AB",
        "BC",
        "MB",
        "NB",
        "NL",
        "NT",
        "NS",
        "NU",
        "ON",
        "PE",
        "QC",
        "SK",
        "YT",
      ]),
    check("postalCode")
      .isString()
      .isLength({ min: 6, max: 7 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("cuisineType")
      .isString()
      .isLength({ min: 1, max: 255 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("distance").isNumeric().not().isEmpty().trim().escape(),
    check("businessHours")
      .isArray({ min: 7, max: 7 })
      //   .isLength({ min: 7, max: 7 })
      .not()
      .isEmpty(),
  ],

  getRestaurants: [
    check("userId").isString({ min: 1, max: 255 }).isNumeric().trim().escape(),
    check("name")
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("cuisineType")
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .trim()
      .escape(),
    check("distance").optional().isNumeric().trim().escape(),
    check("city")
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .trim()
      .escape(),
    check("province")
      .optional()
      .isString()
      .isIn([
        "AB",
        "BC",
        "MB",
        "NB",
        "NL",
        "NT",
        "NS",
        "NU",
        "ON",
        "PE",
        "QC",
        "SK",
        "YT",
      ]),
    check("postalCode")
      .optional()
      .isString()
      .isLength({ min: 3, max: 7 })
      .not()
      .isEmpty()
      .trim()
      .escape(),

    check("currentlyOpen").optional().isNumeric().isIn(["0", "1"]),
  ],

  updateRestaurant: [
    check("id").isInt(),
    check("name")
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
    check("cuisineType")
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .trim()
      .escape(),
    check("distance").optional().isNumeric().trim().escape(),
    check("city")
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .trim()
      .escape(),
    check("province")
      .optional()
      .isString()
      .isIn([
        "AB",
        "BC",
        "MB",
        "NB",
        "NL",
        "NT",
        "NS",
        "NU",
        "ON",
        "PE",
        "QC",
        "SK",
        "YT",
      ]),
    check("postalCode")
      .optional()
      .isString()
      .isLength({ min: 6, max: 7 })
      .not()
      .isEmpty()
      .trim()
      .escape(),
  ],

  getFavourites: [
    check("userId").not().isEmpty().isNumeric().isLength({ min: 1, max: 255 }),
  ],

  addOrRemoveFavourite: [
    check("userId").not().isEmpty().isInt().isLength({ min: 1, max: 255 }),
    check("restaurantId")
      .not()
      .isEmpty()
      .isInt()
      .isLength({ min: 1, max: 255 }),
  ],

  getBlackList: [
    check("userId").not().isEmpty().isNumeric().isLength({ min: 1, max: 255 }),
  ],

  addOrRemoveFromBlacklist: [
    check("userId").not().isEmpty().isInt().isLength({ min: 1, max: 255 }),
    check("restaurantId")
      .not()
      .isEmpty()
      .isInt()
      .isLength({ min: 1, max: 255 }),
  ],

  validate: (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  },
};
