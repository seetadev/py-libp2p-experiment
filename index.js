import _ from 'lodash'
import cluster from './cluster'
import scheduler from './scheduler'
import Web3 from 'web3'
import web from './web-server'

const args = _.reduce(process.argv.slice(2), (args, arg) => {
  const [k, v = true] = arg.split('=')
  args[k] = v
  return args
}, {})

const port = args.port || 5000
const nodes = args.nodes && args.nodes.split(',') || []

// Start cluster with libp2p
cluster.start(port, nodes).then(() => {
  console.log('Cluster started successfully')

  // Start scheduler
  scheduler.start(
    new Web3.providers.HttpProvider('http://localhost:8545'),
    '0x3534EFCa1ffe18A955e16de775c251ba95224bAF',
    '0x2d862bead594d5f499c747929c4715b8fa4e5fb94c31012a73202e6aa845df3c'
  )

  // Start web server
  web.start()

  // Listen for cluster membership changes
  cluster.on('memberJoin', (peerId) => {
    console.log(`New member joined: ${peerId}`)
  })

  cluster.on('memberLeave', (peerId) => {
    console.log(`Member left: ${peerId}`)
  })
}).catch(error => {
  console.error('Failed to start cluster:', error)
  process.exit(1)
})

process.stdin.resume()

// Graceful shutdown
const cleanup = async () => {
  console.log('\nShutting down gracefully...')
  
  try {
    await scheduler.cleanup()
    await cluster.stop()
    console.log('Cleanup completed')
    process.exit(0)
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

process.on('exit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)