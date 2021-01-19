const griffin = require("griffin-core")
const Gun = require("gun/gun")
require("gun/sea")
require("gun/lib/webrtc")
const shuffle = require("array-shuffle")

function Griffin(options) {
	options = options || {}
	const bootstraps = options.bootstraps || []

	const gun = Gun({
		peers: options.peers || options,
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
		const peers = shuffle(localStorage.getItem("peers"))
		const amount = Math.min(options.backup || 2, peers.length)
		const body = {
			key,
			value: data,
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
		const peers = shuffle(localStorage.getItem("peers"))

		let retry = 1

		const send = (peer) => {
			const url = peer + "/api/get?key=" + key

			fetch(url)
				.then(data => {
					on(data)
				})
				.catch(() => {
					retry += 1
					if (retry < peers.length) send(peers[retry])
				})
		}

		if (peers.length > 0) send(peers[0])
	}

	return griffin.Griffin({
		gun,
		SEA: Gun.SEA,
		skynet: options.skynet || "https://siasky.net",
		backup,
		retrieve,
	})
}

module.exports = Griffin
