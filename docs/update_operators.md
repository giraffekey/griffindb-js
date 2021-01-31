## Update Operators

> **_NOTE:_** The examples in this section use documents from the following dogs collection:
> ```
> const dogs = await db.collection("dogs")
> 
> await dogs.insert([
>     { name: "Gordon", color: "black", age: 3, owners: ["John", "Cindy"] },
>     { name: "Pooch", color: "brown", age: 5, owners: ["John", "Cindy"] },
>     { name: "Snuffles", color: "brown", age: 7, owners: ["Karen"] }
> ]).many()
> ```

- #### $inc
  The $inc operator increments the value of a field by a specified amount.

  Syntax:

    ```
    { $inc: { <field1>: <amount1>, <field2>: <amount2>, ... } }
    ```

  Example:

  The following example updates the fields of a document in the dogs collection whose age is 5 by incrementing the value of age field by 1:

    ```
    dogs.update( { age: 5 }, { $inc: { age: 1 } })
    ```

- #### $min
  The $min operator updates the value of a field to a specified value if the specified value is less than (<) the current value of the field.

  Syntax:

    ```
    { $min: { <field1>: <value1>, <field2>: <value2>, ... } }
    ```

  Example:

  The following example updates a document in the dogs collection whose name is Snuffles by changing the value of age field to 6 if 6 is less than the current value of age field:

    ```
    dogs.update( { name: "Snuffles" }, { $min: { age: 6 } } )
    ```

- #### $max
  The $max operator updates the value of a field to a specified value if the specified value is greater than (>) the current value of the field.

  Syntax:

    ```
    { $max: { <field1>: <value1>, <field2>: <value2>, ... } }
    ```

  Example:

  The following example updates a document in the dogs collection whose name is Pooch by changing the value of age field to 6 if 6 is greater than the current value of age field:

    ```
    dogs.update( { name: "Pooch" }, { $max: { age: 6 } } )
    ```

- #### $mul
  The $mul operator is used to multiply the value of a field by a specified number.

  Syntax:

    ```
    { $mul: { <field1>: <number1>, <field2>: <number2>, ... } }
    ```

  Example:

  The following example updates the dogs collection by multiplying the value of age field by 2 in the document which matches the specified condition, i.e., name = Gordon:

    ```
    dogs.update( { name: "Gordon" }, { $mul: { age: 2 } } )
    ```

- #### $rename
  The $rename operator is used to update the name of a field to the new one.

  Syntax:

    ```
    { $rename: { <field1>: <newName1>, <field2>: <newName2>, ... } }
    ```

  Example:

  The following example updates the dogs collection by renaming the field color to colour in the document which matches the specified condition, i.e., name = Gordon:

    ```
    dogs.update( { name: "Gordon" }, { $rename: { color: "colour" } } )
    ```

- #### $set
  The $set operator is used to replace the value of a field with the specified value.

  Syntax:

    ```
    { $set: { <field1>: <value1>, ... } }
    ```

  Example:

  The following example updates the dogs collection by replacing the value of color field with value black in the document which matches the specified condition, i.e., name = Pooch:

    ```
    dogs.update( { name: "Pooch" }, { $set: { color: "black" } } )
    ```

- #### $unset
  The $unset operator is used to remove a particular field from a document.

  Syntax:

    ```
    { $unset: { <field1>: "", ... } }
    ```

  Example:

  The following example updates the dogs collection by removing the color field from the document where the field name has a value of Snuffles:

    ```
    dogs.update( { name: "Snuffles" }, { $unset: { color: "" } } )
    ```
