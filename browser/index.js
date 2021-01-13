const griffin = require("griffin-core")
const Gun = require("gun/gun")
require("gun/sea")
require("gun/lib/webrtc")
const shuffle = require("array-shuffle")

function Griffin(options) {
	const bootstraps = options?.bootstraps || ["http://159.203.81.101"]

	const gun = Gun({
		peers: options?.peers || options,
	})

	if (localStorage.getItem("gun_peers")) {
		gun.opt({ peers: localStorage.getItem("gun_peers") })
	} else {
		let peers = new Set()

		let j = 0
		for (let i = 0; i < bootstraps.length; i++) {
			const url = bootstraps[i] + "/api"
			fetch(url).then(data => {
				peers.add(...data.peers)
				j++
				if (j >= bootstraps.length) {
					const gun_peers = shuffle([...peers]).slice(0, 5)
					gun.opt({ peers: gun_peers })
					localStorage.setItem("gun_peers", gun_peers)
				}
			})
		}
	}

	return griffin.Griffin({
		gun,
		SEA: Gun.SEA,
		skynet: options?.skynet || "https://siasky.net",
	})
}

module.exports = Griffin
