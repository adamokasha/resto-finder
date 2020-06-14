const { UserController } = require("../controllers/user.controller");
const {
  addUser,
  getUser,
  validate,
} = require("../middlewares/validation-middlewares");

const userController = new UserController();

module.exports = (app) => {
  /**
   * POST /user
   *
   * Add a new user
   */
  app.post("/user", validate(addUser), userController.addUser);

  /**
   * GET /user/list
   *
   * Get a list of all the current users
   */
  app.get("/user/list", userController.getAllUsers);

  /**
   * GET /user/:id
   *
   * Get user by id
   */
  app.get("/user/:id", validate(getUser), userController.getUserById);
};
