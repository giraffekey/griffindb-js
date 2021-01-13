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
	const bootstraps = options.bootstraps || ["http://159.203.81.101"]

	const port = parseInt(options.port || process.env.PORT) || 8765

	let config = {
		gun: {
			peers: options.peers,
			s3: options.s3,
			localStorage: false,
		},
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

		config.gun.web = server.listen(port + 1)
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
  		let list = []

  		for (let i = 0; i < bootstraps.length; i++) {
  			const bootstrap = bootstraps[i]
  			const url = bootstrap + "/p2p"

  			await new Promise((resolve) => {
  				const protocol = bootstrap.startsWith("https") ? https : http
  				const req = protocol.request(url, {}, res => {
		  			let data = ""
		  			res.on("data", chunk => (data += chunk))
		  			res.on("end", () => {
		  				list.push(data)
		  				resolve()
		  			})
				})
				req.on("error", resolve)
				req.end()
  			})
  		}

  		if (list.length) {
  			modules.peerDiscovery.push(Bootstrap)
  			config.peerDiscovery = {
		  		autoDial: true,
		  		[Bootstrap.tag]: {
		    		enabled: true,
		    		list,
		    	},
		  	}
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

	const gun_peers = () => shuffle(Object.values(peers)).slice(0, 5)

	node.connectionManager.on("peer:connect", (conn) => {
		const peer = conn.remotePeer.toB58String()
		if (server) console.log(peer)
		if (!peers[peer]?.includes("/p2p/")){
			const { address } = conn.remoteAddr.nodeAddress()
			peers[peer] = `http://${address}/gun`
		}
		gun.opt({ peers: gun_peers() })
	})

	node.connectionManager.on("peer:disconnect", (conn) => {
		delete peers[conn.remotePeer.toB58String()]
		gun.opt({ peers: gun_peers() })
	})

	if (server) {
		const proxyPass = (req, res, options) => {
			let data = ""

			req.on("data", chunk => (data += chunk))
			req.on("end", () => {
				const { method, headers } = req
				const options2 = {
					...options,
					method,
					headers,
				}

				const req2 = http.request(options2, res2 => {
					let data = ""
					res2.on("data", chunk => (data += chunk))
					res2.on("end", () => res.end(data))
				})
				if (data) req2.write(data)
				req2.end()
			})
		}

		const requestListener = (req, res) => {
			if (req.url === "/gun") {
				proxyPass(req, res, {
					hostname: "127.0.0.1",
 					port: port + 1,
					path: "/gun",
				})
			} else if (req.url === "/p2p") {
				res.writeHead(200)
				let addr = ""
				for (let i = 0; i < node.multiaddrs.length; i++) {
					const multi = node.multiaddrs[i].toString()
					if (!multi.startsWith("/ip4/127.") && !multi.startsWith("/ip4/10.")) {
						addr = multi
						break
					}
				}
				addr += "/p2p/" + node.peerId.toB58String()
				res.end(addr)
			} else if (req.url === "/api") {
				res.setHeader("Content-Type", "application/json")
				res.writeHead(200)
    			res.end(JSON.stringify({ peers: gun_peers() }))
			} else {
				res.writeHead(200)
    			res.end()
			}
		}
		http.createServer(requestListener).listen(port, "0.0.0.0")
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
	const gun = Gun(config.gun)
	await P2P(gun, config.bootstraps, config.port, options.server)
	return griffin.Griffin({
		gun,
		SEA: Gun.SEA,
		skynet: options.skynet || "https://siasky.net",
	})
}

Griffin.server = async (options) => {
	options = options || {}
	const config = gun_config(options)
	const gun = Gun(config.gun)
	await P2P(gun, config.bootstraps, config.port, true)
}

module.exports = Griffin
