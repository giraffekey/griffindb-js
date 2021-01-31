## Query Operators

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

- [Comparison](#comparison)
- [Logical](#logical)

### Comparison

- #### $eq
  The $eq operator specifies equality condition. It is used to match the documents where the value of the field is equal to the specified value.

  Syntax:

    ```
    { <field>: { $eq: <value> } }
    ```

  Example:

  The following example queries the dogs collection to select all documents where the value of the color field equals brown:

    ```
    dogs.find( { color: { $eq: "brown" } } )
    ```

- #### $gt
  The $gt operator is used to select documents where the value of the field is greater than (>) the given value.

  Syntax:

    ```
    { field: { $gt: value } }
    ```

  Example:

  The following example queries the dogs collection to select all documents where the value of the age field is greater than 3:

    ```
    dogs.find( { age: { $gt: 3 } } )
    ```

- #### $gte
  The $gte operator is used to select documents where the value of the field is greater than or equal to (>=) the given value.

  Syntax:

    ```
    { field: { $gte: value } }
    ```

  Example:

  The following example queries the dogs collection to select all documents where the value of the age field is greater than or equal to 2:

    ```
    dogs.find( { age: { $gte: 2 } } )
    ```

- #### $lt
  The $lt operator is used to select documents where the value of the field is less than (<) the given value.

  Syntax:

    ```
    { field: { $lt: value } }
    ```

  Example:

  The following example queries the dogs collection to select all documents where the value of the age field is less than 7:

    ```
    dogs.find( { age: { $lt: 7 } } )
    ```

- #### $lte
  The $lte operator is used to select documents where the value of the field is less than or equal to (<=) the given value.

  Syntax:

    ```
    { field: { $lte: value } }
    ```

  Example:

  The following example queries the dogs collection to select all documents where the value of the age field is less than or equal to 5:

    ```
    dogs.find( { age: { $lte: 5 } } )
    ```

### Logical

- #### $and
  The $and operator performs a logical AND operation on an array of one or more expressions and selects those documents that match all the given expression in the array.

  Syntax:

    ```
    { $and: [ { <expression1> }, { <expression2> } , ... , { <expressionN> } ] }
    ```

  Example:

  The following example queries the dogs collection to select all documents whose name is Pooch and color is brown:

    ```
    dogs.find( { $and: [ { name: "Pooch" }, { color: "brown" } ] } )
    ```

- #### $not
  The $not performs a logical NOT operation on the specified expression and selects those documents that do not match the given expression. It also includes documents that do not contain the field.

  Syntax:

    ```
    { field: { $not: { <expression> } } }
    ```

  Example:

  The following example queries the dogs collection to select all documents whose age is not equal to 5:

    ```
    dogs.find( { age: { $not: { $eq: 5 } } } )
    ```

- #### $or
  The $or operator performs a logical OR operation on an array of two or more expressions and selects those documents that match at least one of the given expression in the array.

  Syntax:
    
  -
    ```
    { $or: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ] }
    ```
  -
    ```
    { field: { $or: [ value1, value2, ... , valueN ] } }
    ```

  Example:

  The following example queries the dogs collection to select all documents whose name is Pooch and color is brown:

    ```
    dogs.find( { $or: [ { name: "Gordon" }, { name: "Pooch" } ] } )
    ```

  The above query can also be written as:
    ```
    dogs.find({ name: { $or: [ "Gordon", "Pooch" ] } })
    ```
