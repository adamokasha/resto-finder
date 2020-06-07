module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      username: DataTypes.STRING,
    },
    { freezeTableName: true, sequelize }
  );

  User.associate = (models) => {
    models.User.hasMany(models.Favourite);
    models.User.hasMany(models.Blacklisted);
  };

  return User;
};
