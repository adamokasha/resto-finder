const UserService = require("../services/user.service");
const {
  addUser,
  getUser,
  validate,
} = require("../middlewares/validation-middlewares");
const { pick } = require("lodash");

module.exports = (app) => {
  /**
   * POST /user
   *
   * Add a new user
   */
  app.post("/user", validate(addUser), async (req, res) => {
    try {
      const userData = pick(req.body, [
        "username",
        "firstName",
        "lastName",
        "city",
        "province",
      ]);

      await UserService.addUser(userData);

      return res
        .status(201)
        .send({ message: `User ${userData.username} created` });
    } catch (e) {
      // For developer debugging. Send to loggly or similar service.
      console.log(e);

      let status;
      let message;

      // Postgres error
      if (e.errors) {
        status = 400;
        message = e.errors.map((err) => err.message);
      } else {
        // Generic error like TypeError for dev to debug
        status = 500;
        message = "Internal Server Error.";
      }

      return res.status(status).send({ message });
    }
  });

  /**
   * GET /user/list
   *
   * Get a list of all the current users
   */
  app.get("/user/list", async (req, res) => {
    try {
      const rows = UserService.getAllUsers();

      return res.status(200).send({ results: rows });
    } catch (e) {
      console.log(e.error);

      res.status(500).send({ message: "Internal Server Error." });
    }
  });

  /**
   * GET /user/:id
   *
   * Get user by id
   */
  app.get("/user/:id", validate(getUser), async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await UserService.getUserById(id);

      if (!rows.length) {
        return res
          .status(404)
          .send({ message: `User with if ${id} not found.` });
      }

      return res.status(200).send(rows[0]);
    } catch (e) {
      console.log(e);

      res.status(500).send({ message: "Internal Server Error." });
    }
  });
};
