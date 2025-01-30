// Create a collection named 'users'
db.createCollection('users');

// Insert some documents into the 'users' collection
db.users.insertMany([
    {
        name: 'John Doe',
        age: 30,
        email: 'john.doe@example.com',
        address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345'
        }
    },
    {
        name: 'Jane Smith',
        age: 25,
        email: 'jane.smith@example.com',
        address: {
            street: '456 Elm St',
            city: 'Othertown',
            state: 'NY',
            zip: '67890'
        }
    },
    {
        name: 'Alice Johnson',
        age: 28,
        email: 'alice.johnson@example.com',
        address: {
            street: '789 Oak St',
            city: 'Somewhere',
            state: 'TX',
            zip: '11223'
        }
    }
]);
