class UserService {
  constructor(userModel, sequelize) {
    this.User = userModel;
    this.Sequelize = sequelize;
  }

  /**
   * addUser
   *
   * Add a user to the database
   *
   * @param {object} userData
   */
  async addUser(userData) {
    return await this.User.create({
      ...userData,
      country: "Canada",
    });
  }

  /**
   * getUserById
   *
   * Get a user by their id
   *
   * @param {string | number} userId
   */
  async getUserById(userId) {
    return await this.User.findAll({
      where: { id: { [this.Sequelize.Op.eq]: userId } },
    });
  }

  /**
   * getAllUsers
   *
   * Get a list of all the users in the database
   */
  async getAllUsers() {
    return await this.User.findAll();
  }
}

module.exports = { UserService };
