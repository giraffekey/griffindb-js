const griffin = require("./core")
const Gun = require("gun/gun")
require("gun/sea")
require("gun/lib/webrtc")
require("zenbase/dist/main.js")
const shuffle = require("array-shuffle")

function Griffin(options) {
	options = options || {}
	const bootstraps = options.bootstraps || []
	options.skynet = {
		secret: (options.skynet && options.skynet.secret) || "secret",
    	portal: (options.skynet && options.skynet.portal) || "https://siasky.net",
	}

	const gun = Gun({
		peers: options.peers || Object.prototype.toString.call(options) === "[object Object]" ? undefined : options,
		...options.skynet,
	})

	let peers = new Set(localStorage.getItem("peers") || [])

	let j = 0
	for (let i = 0; i < bootstraps.length; i++) {
		const url = bootstraps[i] + "/api/peers"
		fetch(url)
			.then(data => {
				peers.add(...data.peers)
				j++
				if (j >= bootstraps.length) {
					localStorage.setItem("peers", [...peers])
				}
			})
			.catch(() => {
				j++
				if (j >= bootstraps.length) {
					localStorage.setItem("peers", [...peers])
				}
			})
	}

	const backup = (key, data) => {
		const peers = localStorage.getItem("peers") ? shuffle(localStorage.getItem("peers")) : []
		const amount = Math.min(options.backup || 2, peers.length)
		const body = {
			key,
			value: JSON.stringify(data),
		}

		let retry = amount

		const send = (peer) => {
			const url = peer + "/api/put"

			fetch(url, {
				method: "PUT",
				body,
			})
				.then(() => {})
				.catch(() => {
					retry += 1
					if (retry < peers.length) send(peers[retry])
				})
		}

		for (let i = 0; i < amount; i++) {
			send(peers[i])
		}
	}

	const retrieve = (key, on) => {
		const peers = localStorage.getItem("peers") ? shuffle(localStorage.getItem("peers")) : []

		let retry = 1

		const send = (peer) => {
			const url = peer + "/api/get?key=" + key

			fetch(url)
				.then(data => {
					on(JSON.parse(data))
				})
				.catch(() => {
					retry += 1
					if (retry < peers.length && retry < 10) send(peers[retry])
					else on(undefined)
				})
		}

		if (peers.length > 0) send(peers[0])
		else on(undefined)
	}

	return griffin.Griffin({
		gun,
		SEA: Gun.SEA,
		skynet: options.skynet,
		backup,
		retrieve,
	})
}

module.exports = Griffin
