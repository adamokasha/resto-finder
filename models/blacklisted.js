module.exports = (sequelize, DataTypes) => {
  const Blacklisted = sequelize.define(
    "Blacklisted",
    {
      username: DataTypes.STRING,
    },
    { freezeTableName: true }
  );

  Blacklisted.associate = (models) => {
    models.Blacklisted.belongsTo(models.User, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
    models.Blacklisted.belongsTo(models.Restaurant, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
  };

  return Blacklisted;
};
