const bip39 = require("bip39")
const Collection = require("./collection")

/*
 * The application"s database, stored under a namespace
 */
function Namespace(SEA, user, name) {
	const db = user.get("@" + name)
	let key = user._.sea

	async function gen() {
		const key = bip39.generateMnemonic()
		db.put({ _key: true, _key_test: await SEA.encrypt(key, key) })
		return key
	}

	function auth(user_key) {
		return new Promise((res, rej) => {
			db.get("_key").once(is_key => {
				if (!is_key) {
					res()
					return
				}
				db.get("_key_test").once(data => {
					if (!data) {
						rej("Key was not found")
						return
					}
					SEA.decrypt(data, user_key)
						.then(result => {
							if (user_key === result) {
								key = user_key
								res()
							} else {
								rej("Key was not valid")
							}
						})
						.catch(() => rej("Key was not valid"))
				})
			})
		})
	}

	function collection(name) {
		return new Promise((res, rej) => {
			db.get("_key").once(is_key => {
				if (is_key && key === user._.sea) {
					rej("Namespace requires user generated key")
				} else {
					res(Collection(SEA, db, name, key))
				}
			})
		})
	}

	return {
		gen,
		auth,
		collection,
	}
}

function Griffin(options) {
	let { gun, SEA, skynet } = options
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
								skynet: options?.skynet || "https://siasky.net",
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
			throw new Error("User is not logged in")
		}
		user.get("griffin").put({ options })
	}

	function leave() {
		if (user === null) {
			throw new Error("User is not logged in")
		}
		user.leave()
		if (!user._.sea) {
			user = null
			return true
		} else {
			return false
		}
	}

	function delete_(username, password) {
		if (user === null) {
			rej("User is not logged in")
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

	function namespace(name) {
		if (user === null) {
			throw new Error("User is not logged in")
		}
		return Namespace(SEA, user, name)
	}

	return {
		create,
		auth,
		opt,
		leave,
		delete: delete_,
		online,
		namespace,
		gun,
		SEA,
	}
}

module.exports = { Griffin }
