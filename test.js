const Namespace = require("./lib/namespace")

let store = {}

const get_ = async (_, __, key) => store[key]
const set_ = async (_, __, key, value) => (store[key] = value)

const db = Namespace("test", get_, set_)
const dogs = db.collection("dogs")

async function main() {
  await db.set("my-key", { pretty: "cool", and: "epic value" })
  console.log(await db.get("my-key"))

  await db.chain("first").chain("second").chain("third").set("fourth", "fifth")
  console.log(await db.chain("first").get("second"))
  await db.chain("first").set("another", 2)
  console.log(await db.chain("first").keys())

  await dogs.insert([
    { name: "Gordon", color: "black", age: 3, owners: ["John", "Cindy"] },
    { name: "Pooch", color: "brown", age: 5, owners: ["John", "Cindy"] },
    { name: "Snuffles", color: "brown", age: 7, owners: ["Karen"] },
  ]).many()
  console.log(await dogs.find({ age: 5 }).one())
  await dogs.update({ age: 5 }, { $inc: { age: 1 } }).one()
  console.log(await dogs.find({ age: 6 }).one())
  await dogs.replace({ name: "Gordon" }, { name: "Gordon Ramsey", color: "blonde", age: 54, owners: null }).one()
  console.log(await dogs.find({ color: "blonde" }).one())
  await dogs.remove({ age: { $gt: 50 }}).one()
  console.log(await dogs.find().many())
}
main()
