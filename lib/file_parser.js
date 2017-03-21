const fs = require('fs')
const stream = require('stream')
const path = require('path')
const FileQueue = require('filequeue')
const fq = new FileQueue(50)

const requireRegexAll = /require\(['"]([^'"]*)['"]\)/i
const requireRegexJS = /require\(['"]([^'"]*.js)['"]\)/i
const importRegexAll = /import .* from ['"]([^'"]*)['"]/i
const reportedCycles = new Set()
const nodes = {}

class FileParser {

  constructor(path, rootNode, parentNode, dir) {
    this.rootNode = rootNode
    this.dir = dir
    this.parentNode = parentNode
    this.path = path
    this.listOfRequires = []
    this.listOfFilesToParse = []
  }

  addChild(node, child) {
    var children = node.children
    if (!children) {
      children = []
      node.children = children
    }
    children.push(child)
  }

  parse() {
    return new Promise((resolve, reject) => {
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
          if (requireRegexAll.exec(line) !== null) {
            var normalPath = path.normalize(requireRegexAll.exec(line)[1])
            that.listOfRequires.push(normalPath)
          }
          else if (importRegexAll.exec(line) !== null) {
            var normalPath = path.normalize(importRegexAll.exec(line)[1])
            that.listOfRequires.push(normalPath)
          }
        })
        transformStream.on('end', function() {
          source.close()
          if (that.listOfRequires.length > 0) {
            that.createChildren(that.parentNode, that.rootNode, that.listOfRequires, that.dir).then(_ => {
              resolve()
            })
          }
          else {
            resolve()
          }
        })
        transformStream.on('error', function(err) {
          console.log(err)
          reject()
        })
      } else {
        resolve()
      }
    })
  }

  resolvedPathAndDir(rootNode, dir, file) {
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

  computeDirAndPath() {
    const t = this.resolvedPathAndDir(this.rootNode, this.dir, this.path)
    this.dir = t.dir
    this.path = t.path
  }

  wouldMakeCycle(node, key) {
    return node.key === key || (node.parentNode && this.wouldMakeCycle(node.parentNode, key))
  }

  logStrand(node, rootNode) {
    console.log(node.key)
    if (node.parentNode) {
      this.logStrand(node.parentNode, rootNode)
    }
  }

  reportCycle(rootNode, parentNode, displayName) {
    const s = parentNode.key + ' => ' + displayName
    // logStrand(parentNode, rootNode)
    if (reportedCycles.has(s)) {
      return
    }
    reportedCycles.add(s)
    console.log('CYCLE: ' + s)
  }

  createChildren(parentNode, rootNode, filesList, dir) {
    let promises = []
    filesList.forEach(key => {
      var localFile = null
      const t = this.resolvedPathAndDir(rootNode, dir, key)
      var file = t.path
      var jsFile = file + '.js'
      var jsDir = file + '/index.js'
      if (fs.existsSync(jsFile)) {
        localFile = key + '.js'
        key = jsFile
      } else {
        if (fs.existsSync(jsDir)) {
          localFile = key + '/index.js'
          key = jsDir
        }
      }
      var cycle
      if (localFile) {
        key = key.replace(rootNode.dir, "")
        cycle = this.wouldMakeCycle(parentNode, key)
        if (cycle) {
          this.reportCycle(rootNode, parentNode, key)
          key = 'CYCLE: ' + key
        }
      } else {
        cycle = false
      }
      var child = nodes[key]
      if (!child) {
        child = {key}
        nodes[key] = child
        if (!cycle && localFile) {
          child.parentNode = parentNode
          var subParser = new FileParser(localFile, rootNode, child, dir)
          promises.push(subParser.parse())
        }
      }
      this.addChild(parentNode, child)
    })
    return Promise.all(promises)
  }
}

module.exports = FileParser
