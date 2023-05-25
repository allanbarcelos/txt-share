var express = require('express');
var path = require('path');
var cors = require('cors');

var app = express();
app.use(cors());
app.use(express.static(__dirname + '/dist/'));
app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname + '/dist/index.html'));
});

app.listen(process.env.PORT || 8080);
