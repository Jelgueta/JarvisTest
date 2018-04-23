var cluster = require('cluster')
var numCPUs = require('os').cpus().length
// let dotenv = require('dotenv/config')
let NODE_ENV = process.env.NODE_ENV

if (NODE_ENV == 'production') {
  if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
      cluster.fork()
    }

    // If a worker dies, log it to the console and start another worker.
    cluster.on('exit', function (worker, code, signal) {
      console.log('Worker ' + worker.process.pid + ' died.')
      cluster.fork()
    })

    // Log when a worker starts listening
    cluster.on('listening', function (worker, address) {
      //   console.log('Worker started with PID ' + worker.process.pid + 'on port' + worker.process.port);
      console.log(`A worker is now connected to port:${address.port}`)
    })
  } else {
    require('./server.js')
  }
} else {
  require('./server.js')
}
