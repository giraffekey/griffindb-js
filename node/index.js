const griffin = require("griffin-core")
const Gun = require("gun")
require("gun/sea")
const Libp2p = require("libp2p")
const TCP = require("libp2p-tcp")
const { NOISE } = require("libp2p-noise")
const MPLEX = require("libp2p-mplex")
const Bootstrap = require("libp2p-bootstrap")
const MulticastDNS = require("libp2p-mdns")
const multiaddr = require("multiaddr")
const cluster = require("cluster")
const fs = require("fs")
const http = require("http")
const https = require("https")
const shuffle = require("array-shuffle")

function gun_config(options) {
	const bootstraps = options.bootstraps || []

	const port = parseInt(options.port || process.env.PORT) || 8765

	let config = {
		peers: options.peers,
		s3: options.s3,
		localStorage: false,
		bootstraps,
		port,
	}

	if (options.server) {
		let server
		if(options.https){
			const config = {
				key: fs.readFileSync(https.key),
				cert: fs.readFileSync(https.cert),
			}
			server = https.createServer(config, Gun.serve(__dirname))
		} else {
			server = http.createServer(Gun.serve(__dirname))
		}

		config.web = server.listen(port)
	}

	return config
}

async function P2P(gun, bootstraps, port, server) {
	let modules = {
    	transport: [TCP],
    	connEncryption: [NOISE],
    	streamMuxer: [MPLEX],
    	peerDiscovery: [MulticastDNS],
  	}
  	let config = {}

  	if (bootstraps.length) {
  		modules.peerDiscovery.push(Bootstrap)
  		config.peerDiscovery = {
	  		autoDial: true,
	  		[Bootstrap.tag]: {
	    		enabled: true,
	    		list: bootstraps,
	    	},
	  	}
	}

	const node = await Libp2p.create({
	  	addresses: {
	    	listen: [`/ip4/0.0.0.0/tcp/${port}`]
	  	},
	  	modules,
	  	config,
	})

	await node.start()
	process.env.LIBP2P = node.peerId.toB58String()

	node.multiaddrs.forEach(addr => {
	  	console.log(`Listening on: ${addr.toString()}/p2p/${node.peerId.toB58String()}`)
	})

	let peers = {}

	const gun_peers = () => shuffle(Object.values(peers)).slice(0, 5)

	node.connectionManager.on("peer:connect", (conn) => {
		const peer = conn.remotePeer.toB58String()
		if (server) console.log(peer)
		if (!peers[peer]?.includes("/p2p/")){
			const [first, second] = conn.remoteAddr.protos().map(p => p.name)
			const {address, port} = conn.remoteAddr.nodeAddress()
			peers[peer] = `/${first}/${address}/${second}/${port - 1}/gun`
		}
		gun.opt({ peers: gun_peers() })
	})

	node.connectionManager.on("peer:disconnect", (conn) => {
		delete peers[conn.remotePeer.toB58String()]
		gun.opt({ peers: gun_peers() })
	})

	if (server) {
		const requestListener = (req, res) => {
			res.setHeader("Content-Type", "application/json")
			res.writeHead(200)
    		res.end(JSON.stringify({ peers: gun_peers() }))
		}
		http.createServer(requestListener).listen(port + 1, "0.0.0.0")
	}

	const stop = async () => {
		await node.stop()
	  	process.exit(0)
	}

	process.on("SIGTERM", stop)
	process.on("SIGINT", stop)
}

async function Griffin(options) {
	options = options || {}
	options.server = options.server === true || options.server === undefined
	const config = gun_config(options)
	const gun = Gun(config)
	if (options.server) {
		console.log("Griffin node started on port " + config.port)
	}
	await P2P(gun, config.bootstraps, config.port + 1, options.server)
	return griffin.Griffin({
		gun,
		SEA: Gun.SEA,
		skynet: options.skynet || "https://siasky.net",
	})
}

Griffin.server = async (options) => {
	options = options || {}
	const config = gun_config(options)
	const gun = Gun(config)
	console.log("Griffin node started on port " + config.port)
	await P2P(gun, config.bootstraps, config.port + 1, true)
}

module.exports = Griffin
