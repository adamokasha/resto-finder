module.exports = (sequelize, DataTypes) => {
  const Favourite = sequelize.define(
    "Favourite",
    {
      username: DataTypes.STRING,
    },
    { freezeTableName: true }
  );

  Favourite.associate = (models) => {
    models.Favourite.belongsTo(models.User, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
    models.Favourite.belongsTo(models.Restaurant, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
  };

  return Favourite;
};
