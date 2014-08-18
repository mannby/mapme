var parseArgs = require('minimist');              //Using the minimist node package 
var fileParser = require('./lib/fileParser.js');
var pageCreator = require('./lib/pageCreator.js');  //Creating the page
var TreeNode = require("tree-node");

var argArray = parseArgs(process.argv.slice(2));  //Grabbing the command line arguments
var argv = argArray._;
var writeFile = 'dependencies.html';              //the default file being written to
var dataObj = {};
var count = 0;

if(argv.length < 1 || argv.length > 2){
  console.log("Incorrect arguments");
}
else {
  var readFile = argv[0];
  if(argv[1]){
    writeFile = argv[1];
  }
  var rootNode = new TreeNode(readFile);
  var fp = new fileParser(readFile,rootNode,rootNode,__dirname);
  fp.parse(function(err,data){
    console.log("Generating " + count);
    count++;
    var page = new pageCreator(data,writeFile);
    page.create();
  });
}