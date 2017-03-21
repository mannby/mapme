var fs = require('fs');

function getData(srcPath, cb) {
  fs.readFile(srcPath, 'utf8', function (err, data) {
    if (err) cb(err);
    cb(null, JSON.parse(data));
  });
}

function writeData(savPath, data, cb){
  fs.writeFile(savPath, JSON.stringify(data,null,2), function(err) {
    if (err) cb(err);
    else cb(null);
  });
}

module.exports.readFromFile = getData;
module.exports.writeToFile = writeData;