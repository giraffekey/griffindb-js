const griffin = require("griffin-core")
const Gun = require("gun/gun")
require("gun/sea")
require("gun/lib/webrtc")

function Griffin(options) {
	return griffin.Griffin({
		gun: Gun({
			// peers: ["https://griffin-gun.lib/gun"],
			peers: [],
		}),
		SEA: Gun.SEA,
		relays: (options && options.relays) || [],
		skynet: (options && options.skynet) || "https://siasky.net",
	})
}

module.exports = Griffin
