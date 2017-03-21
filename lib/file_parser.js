var fs = require('fs')
var stream = require('stream')
var fileIO = require('./file_helpers.js')
var path = require('path')
var Q = require('q')

var requireRegexAll = /require\(['"]([^'"]*)['"]\)/i
var requireRegexJS = /require\(['"]([^'"]*.js)['"]\)/i
var importRegexAll = /import .* from ['"]([^'"]*)['"]/i
var FileQueue = require('filequeue')
var fq = new FileQueue(50)
var reportedCycles = new Set()

function fileParser(path, rootNode, parentNode, dir) {
  this.rootNode = rootNode
  this.dir = dir
  this.parentNode = parentNode
  this.path = path
  this.listOfRequires = []
  this.listOfFilesToParse = []
}

fileParser.prototype.parse = function(callback) {
  var that = this
  this.computeDirAndPath()
  if (fs.existsSync(this.path)) {
    var source = fq.createReadStream(this.path)

    var transformStream = new stream.Transform({objectMode: true})
     
    transformStream._transform = function (chunk, encoding, done) {
      var data = chunk.toString()
      if (this._lastLineData) data = this._lastLineData + data
      var lines = data.split('\n')
      this._lastLineData = lines.splice(lines.length-1,1)[0]
      lines.forEach(this.push.bind(this))
      done()
    }
     
    transformStream._flush = function (done) {
      if (this._lastLineData) this.push(this._lastLineData)
      this._lastLineData = null
      done()
    }

    source.pipe(transformStream)
    transformStream.on('readable', function() {
      var line = transformStream.read()
      if(requireRegexAll.exec(line) !== null) {
        var normalPath = path.normalize(requireRegexAll.exec(line)[1])
        that.listOfRequires.push(normalPath)
      }
      else if(importRegexAll.exec(line) !== null) {
        var normalPath = path.normalize(importRegexAll.exec(line)[1])
        that.listOfRequires.push(normalPath)
      }
    })
    transformStream.on('end', function() {
      source.close()
      if(that.listOfRequires.length > 0) {
        createChildren(that.parentNode, that.rootNode, that.listOfRequires, that.dir, callback)
      }
      else {
        callback(null)
      }
    })
    transformStream.on('error', function(err) {
      console.log(err)
    })
  }
}

function resolvedPathAndDir(rootNode, dir, file) {
  const f = file
  const d = dir
  var result = {}
  if (file[0] === '~') {
    dir = rootNode.dir
    file = file.slice(2)
  }
  result.path = path.resolve(dir + '/' + file)
  result.dir = path.dirname(result.path)
   return result
}

fileParser.prototype.computeDirAndPath = function() {
  const t = resolvedPathAndDir(this.rootNode, this.dir, this.path)
  this.dir = t.dir
  this.path = t.path
}

function wouldMakeCycle(node, path) {
  return node.path === path || (node.parentNode && wouldMakeCycle(node.parentNode, path))
}

function logStrand(node, rootNode) {
  console.log(node.path.replace(rootNode.dir, ""))
  if (node.parentNode) {
    logStrand(node.parentNode, rootNode)
  }
}

function reportCycle(rootNode, parentNode, displayName) {
  const s = parentNode.path.replace(rootNode.dir, "") + ' => ' + displayName
  // logStrand(parentNode, rootNode)
  if (reportedCycles.has(s)) {
    return
  }
  console.log('CYCLE: ' + s)
}

function createChildren(parentNode, rootNode, filesList, dir, callback) {
  const topLevel = parentNode === rootNode
  for(var i = 0; i < filesList.length; i++) {
    var localFile = null
    var localPath = null
    const t = resolvedPathAndDir(rootNode, dir, filesList[i])
    var file = t.path
    var jsFile = file + '.js'
    var jsDir = file + '/index.js'
    if (fs.existsSync(jsFile)) {
      localPath = jsFile
      localFile = filesList[i] + '.js'
    } else {
      if (fs.existsSync(jsDir)) {
        localPath = jsDir
        localFile = filesList[i] + '/index.js'
      }
    }
    var displayName, cycle
    if (localPath) {
      displayName = localPath.replace(rootNode.dir, "")
      cycle = wouldMakeCycle(parentNode, localPath)
      if (cycle) {
        reportCycle(rootNode, parentNode, displayName)
        displayName = 'CYCLE: ' + displayName
      }
    } else {
      displayName = file
      cycle = false
    }
    if (topLevel) {
      console.log(displayName)
    }
    var child = parentNode.createChild(displayName)
    child.data('file', displayName)
    if (!cycle && localPath) {
      child.parentNode = parentNode
      child.path = localPath
      newParser(localFile, child, rootNode, dir, callback)
    }
  }
}

function newParser(path, parentNode, rootNode, dir, callback) {
  var fp = new fileParser(path, rootNode, parentNode, dir)
  fp.parse(function(err, data) {
    callback(null, rootNode)
  })
}

module.exports = fileParser
