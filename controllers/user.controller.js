const { UserService } = require("../services/user.service");
const { User, Sequelize } = require("../models");
const { pick } = require("lodash");
const autoBind = require("auto-bind");

class UserController {
  constructor() {
    this.userService = new UserService(User, Sequelize);

    // bind methods
    autoBind(this);
  }

  async addUser(req, res) {
    try {
      const userData = pick(req.body, [
        "username",
        "firstName",
        "lastName",
        "city",
        "province",
      ]);

      await this.userService.addUser(userData);

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
  }

  async getAllUsers(req, res) {
    try {
      const rows = await this.userService.getAllUsers();

      return res.status(200).send({ results: rows });
    } catch (e) {
      console.log(e.error);

      res.status(500).send({ message: "Internal Server Error." });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const rows = await this.userService.getUserById(id);

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
}

module.exports = { UserController };
