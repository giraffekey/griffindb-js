const griffin = require("griffin-core")
const Gun = require("gun")
require("gun/sea")

function Griffin(options) {
	return griffin.Griffin({
		gun: Gun({
			s3: options?.s3,
			peers: ["https://griffin-gun-us.herokuapp.com/gun"],
			localStorage: false,
		}),
		SEA: Gun.SEA,
		peers: options?.peers || [],
		skynet: options?.skynet || "https://siasky.net",
	})
}

module.exports = Griffin
