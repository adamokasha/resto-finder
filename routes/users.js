const models = require("../models");
const userValidation = require("../middlewares/validation-middlewares");

module.exports = (app) => {
  /**
   * POST /user
   *
   * Add a new user
   */
  app.post(
    "/user",
    userValidation.addUser,
    userValidation.validate,
    async (req, res) => {
      try {
        const {
          username,
          firstName,
          lastName,
          city,
          province,
          country,
        } = req.body;

        await models.User.create({
          username,
          firstName,
          lastName,
          city,
          province,
          country,
        });

        return res.status(201).send({ message: `User ${username} created` });
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
    }
  );

  /**
   * GET /user/list
   *
   * Get a list of all the current users
   */
  app.get("/user/list", async (req, res) => {
    try {
      const rows = await models.User.findAll();

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
  app.get(
    "/user/:id",
    userValidation.getUser,
    userValidation.validate,
    async (req, res) => {
      try {
        const { id } = req.params;
        const rows = await models.User.findAll({
          where: { id: { [models.Sequelize.Op.eq]: id } },
          limit: 1,
        });

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
    }
  );
};
