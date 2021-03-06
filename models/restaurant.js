module.exports = (sequelize, DataTypes) => {
  const Restaurant = sequelize.define(
    "Restaurant",
    {
      name: DataTypes.STRING,
      city: DataTypes.STRING,
      province: DataTypes.STRING,
      postalCode: DataTypes.STRING,
      country: DataTypes.STRING,
      cuisineType: DataTypes.STRING,
      distance: DataTypes.INTEGER,
    },
    { freezeTableName: true, sequelize }
  );

  Restaurant.associate = (models) => {
    models.Restaurant.hasMany(models.Favourite);
    models.Restaurant.hasMany(models.Blacklist, { as: "Blacklisted" });
    models.Restaurant.hasMany(models.BusinessHours);
  };

  return Restaurant;
};
