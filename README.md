# griffin

Griffin is a decentralized, offline-first, key-value based, document-oriented database built on the Sia blockchain.

Users are empowered with the ability to store their own easily accessible encrypted data permanently without relying on centralized providers.

Developers are empowered with a flexible and easy-to-use database that can function as a MongoDB-like query language, key-value store, chain context graph or file storage engine.

## Usage

Note: None of this is implemented yet

`npm i griffindb`

`yarn add griffindb`

```js
import Griffin from "griffin-browser"

const griffin = Griffin("https://siasky.net")
const key = await griffin.gen() // The user's key
const db = await griffin.namespace("my-app", key)

const dogs = db.collection("dogs")

// Insertion
await dogs.insert([
  { name: "Gordon", color: "black", age: 3, owners: ["John", "Cindy"] },
  { name: "Pooch", color: "brown", age: 5, owners: ["John", "Cindy"] },
  { name: "Snuffles", color: "brown", age: 7, owners: ["Karen"] },
  ...
]).many()

// Finds and queries
console.log(await dogs.find({ color: "brown" }).sort({ name: 1 }).one())
console.log(await dogs.find({ name: { $or: ["Gordon", "Pooch"] } }).fields({ _id: 0 }).many())
console.log(await dogs.find({ age: { $lt: 7, $gte: 3 } }).limit(10).many())

// Update/replace
await dogs.update({ age: 5 }, { $inc: { age: 1 } }).one()
await dogs.replace({ name: "Gordon" }, { name: "Gordon Ramsey", color: "blonde", age: 54, owners: null })

// Key-value store
await db.set("username", "gnufag")
await db.get("friends") // returns null in this scenario
await db.remove("typoo")

// Chain context
await db.chain("options").set("skynet-portal", "https://custom-sky.net")
await db.chain("deeply").chain("nested").chain("chains").chain("are").get("cool")
```
