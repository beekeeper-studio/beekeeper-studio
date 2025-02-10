// Create collections
db.createCollection('films');
db.createCollection('actors');
db.createCollection('customers');
db.createCollection('stores');
db.createCollection('rentals');

// Insert sample films
db.films.insertMany([
  {
    _id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f1"),
    title: "ACADEMY DINOSAUR",
    description: "A Epic Drama of a Feminist And a Mad Scientist who must Battle a Teacher in The Canadian Rockies",
    release_year: 2006,
    language: "English",
    rental_duration: 6,
    rental_rate: 0.99,
    length: 86,
    replacement_cost: 20.99,
    rating: "PG",
    special_features: ["Deleted Scenes", "Behind the Scenes"],
    actors: [
      {
        actor_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f2"),
        first_name: "PENELOPE",
        last_name: "GUINESS"
      },
      {
        actor_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f3"),
        first_name: "CHRISTIAN",
        last_name: "GABLE"
      }
    ],
    category: {
      category_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f4"),
      name: "Documentary"
    },
    inventory: [
      {
        inventory_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f5"),
        store_id: 1,
        available: true
      },
      {
        inventory_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f6"),
        store_id: 2,
        available: false
      }
    ]
  }
]);

// Insert sample actors
db.actors.insertMany([
  {
    _id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f2"),
    first_name: "PENELOPE",
    last_name: "GUINESS",
    films: [
      {
        film_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f1"),
        title: "ACADEMY DINOSAUR"
      }
    ]
  },
  {
    _id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f3"),
    first_name: "CHRISTIAN",
    last_name: "GABLE",
    films: [
      {
        film_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f1"),
        title: "ACADEMY DINOSAUR"
      }
    ]
  }
]);

// Insert sample customers
db.customers.insertMany([
  {
    _id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f7"),
    first_name: "MARY",
    last_name: "SMITH",
    email: "MARY.SMITH@sakilacustomer.org",
    address: {
      street: "123 Main St",
      city: "Lethbridge",
      state: "Alberta",
      postal_code: "T1K 5X8",
      country: "Canada"
    },
    active: true
  }
]);

// Insert sample stores
db.stores.insertMany([
  {
    _id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f8"),
    manager_staff_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f9"),
    address: {
      street: "456 Elm St",
      city: "Calgary",
      state: "Alberta",
      postal_code: "T2P 5J5",
      country: "Canada"
    }
  }
]);

// Insert sample rentals
db.rentals.insertMany([
  {
    _id: ObjectId("64a1b1c2e4b0a1b2c3d4e5fa"),
    rental_date: new Date("2023-07-01T10:00:00Z"),
    inventory_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f5"),
    customer_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f7"),
    return_date: null,
    staff_id: ObjectId("64a1b1c2e4b0a1b2c3d4e5f9")
  }
]);
