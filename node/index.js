const griffin = require("griffin-core")
const Gun = require("gun/gun")
require("gun/sea")

function Griffin(options) {
	return griffin.Griffin({
		gun: Gun({
			s3: options && options.s3,
			// peers: ["https://griffin-gun.lib"],
			peers: [],
		}),
		relays: (options && options.relays) || [],
		skynet: (options && options.skynet) || "https://siasky.net",
	})
}

module.exports = Griffin
