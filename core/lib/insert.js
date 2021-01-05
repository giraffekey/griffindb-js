const { v4: uuidv4 } = require("uuid")
const pmap = require("promise.map")
const { clean } = require("./util")

function insert(SEA, col, key, docs, options) {
	return new Promise(async (res, rej) => {
		if (options.one) docs = [docs]
		else if (!Array.isArray(docs)) {
			rej("Documents must be an array")
			return
		}

		const { ordered } = options
		let ids = []
		let promises = []

		for (let i = 0; i < docs.length; i++) {
			let doc = docs[i]

			if (Object.prototype.toString.call(doc) !== "[object Object]") {
				if (ordered) {
					rej(`Document ${i} must be an object`)
					return
				} else {
					console.error(`Document ${i} must be an object`)
					continue
				}
			}

			const id = uuidv4()

			try {
				doc = { _id: id, ...clean(doc) }
				doc = await SEA.encrypt(doc, key)
			} catch(e) {
				if (ordered) {
					rej(e)
					return
				} else {
					console.error(e)
					continue
				}
			}

			if (ordered) {
				try {
					await new Promise((res, rej) => {
						col.get(id).put(doc, ack => {
							if (ack.err) {
								rej(`Failed to insert document ${i}`)
							} else {
								ids.push(id)
								res()
							}
						})
					})
				} catch(e) {
					rej(e)
					return
				}
			} else {
				promises.push(new Promise((res, rej) => {
					col.get(id).put(doc, ack => {
						if (ack.err) {
							console.error(`Failed to insert document ${i}`)
						} else {
							ids.push(id)
							res()
						}
					})
				}))
			}
		}

		if (!ordered) await pmap(promises, p => p, 30)

		res(ids)
	})
}

/*
 * Search through the entire collection and retrieve those who match the query
 * Options:
 *   ordered - Prevent inserting remaining documents if one insert fails
 */
function Insert(SEA, col, key, docs, options) {
	function ordered(ordered) {
		if (ordered === undefined) ordered = true
		return Insert(SEA, col, key, docs, {
			...options,
			ordered,
		})
	}

	function one() {
		options.one = true
		return insert(SEA, col, key, docs, options)
	}

	function many() {
		options.one = false
		return insert(SEA, col, key, docs, options)
	}

	return {
		ordered,
		one,
		many,
	}
}

module.exports = Insert
