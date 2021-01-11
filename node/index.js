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

async function server(options) {
	let server
	if(options?.https){
		const config = {
			key: fs.readFileSync(https.key),
			cert: fs.readFileSync(https.cert),
		}
		server = https.createServer(config, Gun.serve(__dirname))
	} else {
		server = http.createServer(Gun.serve(__dirname))
	}

	const bootstraps = options?.bootstraps || ["/dnsaddr/griffin-bootstrap-us.herokuapp.com/p2p/QmRg829xJ7Vpc3tW3sw4dhmie2WF1fCHExZkvFAAcEfjih"]
	let gun_peers = options?.peers || []
	if (bootstraps) gun_peers.push(...bootstraps)

	const port = options?.port || process.env.PORT || 8765
	const gun = Gun({
		web: server.listen(port),
		peers: gun_peers,
		s3: options?.s3,
		localStorage: false,
	})
	console.log("Griffin node started on port " + port)

	let modules = {
    	transport: [TCP],
    	connEncryption: [NOISE],
    	streamMuxer: [MPLEX],
    	peerDiscovery: [MulticastDNS],
  	}
  	let config = {}

  	if (bootstraps?.length) {
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
	    	listen: ["/ip4/0.0.0.0/tcp/0"]
	  	},
	  	modules,
	  	config,
	})

	await node.start()

	node.multiaddrs.forEach(addr => {
	  	console.log(`Listening on: ${addr.toString()}/p2p/${node.peerId.toB58String()}`)
	})

	let peers = {}

	const get_peers = () => shuffle(Object.values(peers)).slice(0, 5)

	node.connectionManager.on('peer:connect', (conn) => {
		const peer = conn.remotePeer.toB58String()
		if (!peers[peer]?.includes("/p2p/")) peers[peer] = `${conn.remoteAddr.toString()}/gun`
		gun.opt({ peers: get_peers(peers) })
		console.log(get_peers(peers))
	})

	node.connectionManager.on('peer:disconnect', (conn) => {
		delete peers[conn.remotePeer.toB58String()]
		gun.opt({ peers: get_peers(peers) })
	})

	const stop = async () => {
		await node.stop()
	  	process.exit(0)
	}

	process.on("SIGTERM", stop)
	process.on("SIGINT", stop)

	return gun
}

async function Griffin(options) {
	return griffin.Griffin({
		gun: await server(options),
		SEA: Gun.SEA,
		skynet: options?.skynet || "https://siasky.net",
	})
}

Griffin.server = server

module.exports = Griffin
