const griffin = require("griffin-core")
const Gun = require("gun")
require("gun/sea")
const Libp2p = require("libp2p")
const TCP = require("libp2p-tcp")
const { NOISE } = require("libp2p-noise")
const MPLEX = require("libp2p-mplex")
const Bootstrap = require("libp2p-bootstrap")
const MulticastDNS = require("libp2p-mdns")
const Gossipsub = require("libp2p-gossipsub")
const DHT = require("libp2p-kad-dht")
const multiaddr = require("multiaddr")
const cluster = require("cluster")
const fs = require("fs")
const http = require("http")
const https = require("https")
const dns = require("dns")
const address = require("address")

async function gun_config(options) {
	const bootstraps = options.bootstraps || []

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

	config.hostname = address.ip()

	await new Promise((res) => {
		dns.lookupService(config.hostname, 443, (err, hostname) => {
			if (!err && hostname.startsWith("https://")) {
				config.hostname = hostname
				res()
			} else {
				dns.lookupService(config.hostname, 80, (err, hostname) => {
					if (!err && hostname.startsWith("http://")) {
						config.hostname = hostname
					}
					res()
				})
			}
		})
	})

	config.hostname += ":" + port

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

	return config
}

async function P2P(gun, bootstraps, hostname, port, api) {
	let modules = {
    	transport: [TCP],
    	connEncryption: [NOISE],
    	streamMuxer: [MPLEX],
    	peerDiscovery: [MulticastDNS],
    	pubsub: Gossipsub,
    	dht: DHT,
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
	const peerId = node.peerId.toB58String()

	node.multiaddrs.forEach(addr => {
	  	console.log(`Listening on: ${addr.toString()}/p2p/${peerId}`)
	})

	let peers = {}
	let republish = {}

	node.connectionManager.on("peer:connect", (conn) => {
		const peer = conn.remotePeer.toB58String()
		if (!peers[peer]) republish[peer] = true

		node.pubsub.on(peer, msg => {
			peers[peer] = msg.data.toString()
			republish[peer] = false
		})
		node.pubsub.subscribe(peer)

		setTimeout(() => {
			if (republish[peer]) {
				node.pubsub.publish(peerId, hostname)
				setTimeout(() => (republish[peer] = true), 10 * 60 * 1000)
			}
		}, 1000)
	})

	node.connectionManager.on("peer:disconnect", (conn) => {
		const peer = conn.remotePeer.toB58String()
		delete peers[peer]
		republish[peer] = true
	})

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
			req2.on("error", console.error)
			req2.end()
		})
	}

	const requestListener = (req, res) => {
		try {
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
				addr += "/p2p/" + peerId
				res.end(addr)
			} else if (req.url === "/api/peers") {
				res.setHeader("Content-Type", "application/json")
				res.writeHead(200)
				res.end(JSON.stringify({ peers: Object.values(peers) }))
			} else if (req.url === "/api/put") {
				let data = ""
				req.on("data", chunk => (data += chunk))
				req.on("end", () => {
					const { key, value } = JSON.parse(data)
					gun.get(key).put(value)
					node._dht.put(Buffer.from(key, "utf8"), Buffer.from(value, "utf8"))
				})
			} else if (req.url.startsWith("/api/get")) {
				const key = new URL(req.url, `http://${req.headers.host}`).searchParams.get("key")
				gun.get(key).once(async data => {
					res.setHeader("Content-Type", "application/json")
					if (data) {
						res.writeHead(200)
						res.end(JSON.stringify({ data }))
					} else {
						const value = await node._dht.get(Buffer.from(key, "utf8"))
						const data = Buffer.from(value).toString("utf8")
						res.writeHead(200)
						res.end(JSON.stringify({ data }))
					}
				})
			} else {
				res.writeHead(404)
				res.end()
			}
		} catch (e) {
			res.writeHead(500)
			res.end(e.toString())
		}
	}
	http.createServer(requestListener).listen(port, "0.0.0.0")

	const stop = async () => {
		await node.stop()
	  	process.exit(0)
	}

	process.on("SIGTERM", stop)
	process.on("SIGINT", stop)

	const backup = (key, data) => {
		try {
			node._dht.put(Buffer.from(key, "utf8"), Buffer.from(JSON.stringify(data), "utf8"))
		} catch (e) {
			console.error(e)
		}
	}

	const retrieve = (key, on) => {
		try {
			node._dht.get(Buffer.from(key, "utf8"))
				.then(value => {
					const data = Buffer.from(data).toString("utf8")
					on(JSON.parse(data))
				})
		} catch (e) {
			console.error(e)
			on(null)
		}
	}

	return { backup, retrieve }
}

async function Griffin(options) {
	options = options || {}
	options.skynet = {
		secret: (options.skynet && options.skynet.secret) || "secret",
    	portal: (options.skynet && options.skynet.portal) || "https://siasky.net",
	}
	const config = await gun_config(options)
	const gun = Gun(config.gun)
	const { backup, retrieve } = await P2P(gun, config.bootstraps, config.hostname, config.port)
	return griffin.Griffin({
		gun,
		SEA: Gun.SEA,
		skynet: options.skynet,
		backup,
		retrieve,
	})
}

Griffin.server = async (options) => {
	options = options || {}
	const config = await gun_config(options)
	const gun = Gun(config.gun)
	await P2P(gun, config.bootstraps, config.hostname, config.port)
}

module.exports = Griffin
