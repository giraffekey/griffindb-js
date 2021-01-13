const Griffin = require("griffin-nodejs")

Griffin.server({
	port: 80,
	peers: ["https://gun-us.herokuapp.com/gun"],
	bootstraps: [],
})
