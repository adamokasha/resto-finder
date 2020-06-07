module.exports = (sequelize, DataTypes) => {
  const BusinessHours = sequelize.define(
    "BusinessHours",
    {
      day: DataTypes.INTEGER,
      open: DataTypes.TIME,
      close: DataTypes.TIME,
    },
    { freezeTableName: true }
  );

  BusinessHours.associate = (models) => {
    models.BusinessHours.belongsTo(models.Restaurant, {
      onDelete: "CASCADE",
      foreignKey: {
        allowNull: false,
      },
    });
  };

  return BusinessHours;
};
