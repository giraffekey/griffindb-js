const griffin = require("griffin-core")
const Gun = require("gun/gun")
require("gun/sea")
require("gun/lib/webrtc")

function Griffin(options) {
	const boostraps = options?.bootstraps || ["https://griffin-bootstrap-us.herokuapp.com"]

	return griffin.Griffin({
		gun: Gun({
			peers: options?.peers || options,
		}),
		SEA: Gun.SEA,
		skynet: options?.skynet || "https://siasky.net",
	})
}

module.exports = Griffin
