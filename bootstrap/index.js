const Griffin = require("griffin-nodejs")

Griffin.server({
	port: 8765,
	peers: ["https://gun-us.herokuapp.com/gun"],
	bootstraps: [],
})
