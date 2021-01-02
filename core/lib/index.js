function Griffin(options) {
	let { gun, relays, skynet } = options
	gun.opt({ peers: relays })
	let user = null

	function create(username, password, options, unique) {
		return new Promise((res, rej) => {
			const created_user = gun.user().create(username, password, ack => {
				if (ack.err) {
					rej(ack.err)
				} else {
					gun.get(`~@${username}`).once(data => {
						if (unique && data) {
							rej("User already created!")
						} else {
							created_user.get("griffin").get("options").put({
								relays: (options && options.relays) || [],
								skynet: (options && options.skynet) || "https://siasky.net",
							})
							res(ack.pub)
						}
					})
				}
			})
		})
	}

	function auth(username, password) {
		return new Promise((res, rej) => {
			const auth_user = gun.user().auth(username, password, ack => {
				if (ack.err) {
					rej(ack.err)
				} else {
					user = auth_user
					const fn = options => {
						if (options) {
							gun.opt({ peers: options.relays })
							skynet = options.skynet
						}
					}
					user.get("griffin").get("options").once(fn)
					user.get("griffin").get("options").on(fn)
					res(ack.get.substring(1))
				}
			})
		})
	}

	function opt(options) {
		if (user === null) {
			throw new Error("User is null")
		}
		user.get("griffin").put({ options })
	}

	function leave() {
		if (user === null) {
			throw new Error("User is null")
		}
		user.leave()
		if (!user._.sea) {
			user = null
			return true
		} else {
			return false
		}
	}

	function del(username, password) {
		if (user === null) {
			rej("User is null")
		}
		return new Promise((res, rej) => {
			user.delete(username, password, ack => {
				if (ack.ok === 0) {
					user = null
					res()
				} else {
					rej("Could not delete user")
				}
			})
		})
	}

	function online() {
		return user !== null
	}

	function namespace(ns) {
		// return Namespace(ns)
	}

	return {
		create,
		auth,
		opt,
		leave,
		delete: del,
		online,
		namespace,
	}
}

module.exports = { Griffin }
