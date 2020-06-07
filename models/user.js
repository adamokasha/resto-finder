module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      username: { type: DataTypes.STRING, unique: true },
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      city: DataTypes.STRING,
      province: DataTypes.STRING,
      country: DataTypes.STRING,
    },
    { freezeTableName: true, sequelize }
  );

  User.associate = (models) => {
    models.User.hasMany(models.Favourite);
    models.User.hasMany(models.Blacklisted);
  };

  return User;
};
