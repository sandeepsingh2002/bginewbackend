require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const port = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed', err.message);
    process.exit(1);
  });
