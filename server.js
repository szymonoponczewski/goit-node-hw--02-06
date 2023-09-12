const app = require("./app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;
const uriDb = process.env.DB_HOST;
const connection = mongoose.connect(uriDb, { dbName: "db-contacts" });

connection
  .then(() => {
    app.listen(PORT, () => {
      console.log("Database connection successful");
      console.log("Server running. Use our API on port: 3000");
    });
  })
  .catch((err) => {
    console.log(`Server not running. Error message: ${err.message}`);
    process.exit(1);
  });
