const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//para importar os controllers
require('./app/controllers/index')(app);

app.listen(3000, () => {
    console.log("Servidor rodando porta: 3000");
});