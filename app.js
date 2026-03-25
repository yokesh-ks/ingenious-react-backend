const express = require('express');

const app = express();

// Logging middleware - moved before routes
app.use((req, res, next) => {
  console.log(`${req.method} request for ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hello World');  
});

// Add process.env.PORT
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);  
});

// Basic error handler
app.use((err, req, res, next) => {
  console.log(req)
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
