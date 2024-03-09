const express = require('express');
const bodyParser = require('body-parser');
const customerRoutes = require('./src/routes/customerRoutes');

const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

app.use(bodyParser.json());

// Use customer routes
app.use('/api', customerRoutes);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
