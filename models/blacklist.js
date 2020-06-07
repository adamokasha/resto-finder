module.exports = (sequelize, DataTypes) => {
  const Blacklist = sequelize.define(
    "Blacklist",
    {
      username: DataTypes.STRING,
    },
    { freezeTableName: true }
  );

  Blacklist.associate = (models) => {
    models.Blacklist.belongsTo(models.User, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
    models.Blacklist.belongsTo(models.Restaurant, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
  };

  return Blacklist;
};
