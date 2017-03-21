reqtree
=======
reqtree is an npm module to help visualize an applications dependency structure with an easy to understand tree visualization. Simply run reqtree on the starting point of your app (e.g. app.js or server.js) and reqtree will open an interactive d3 based tree showing you what your file dependencies are for your project. 

# Getting Started
To install reqtree, you can either:

install through npm

     npm (-g) install reqtree

or clone the source


# Running reqtree
reqtree takes two arguments

     reqtree path/to/file.js [outputFile.html OPTIONAL]

path/to/file.js is the entry point of your node.js app(like app.js usually). The path to the file can be relative if you have reqtree installed globally, or absolute if you're calling reqtree from the bin directory.

If you installed reqtree locally as a npm module, you can find it in your project's 
     
     /node_modules/.bin/reqtree

# Created By
Claes-Fredrik Mannby (Based on mapme by: Hareesh Nagaraj, Dheeraj Manjunath)

# License
MIT
