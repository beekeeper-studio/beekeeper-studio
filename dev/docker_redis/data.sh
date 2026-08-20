#!/bin/bash

# Shared by the redis and valkey dev containers. The valkey image ships
# valkey-cli rather than redis-cli, so let the caller override the binary.
CLI="${REDIS_CLI:-redis-cli}"

# Wait for the server to be ready
until $CLI ping; do
  echo "Waiting for $CLI to be ready..."
  sleep 1
done

echo "Server is ready. Loading example data..."

# String examples
$CLI SET user:1:name "John Doe"
$CLI SET user:1:email "john.doe@example.com"
$CLI SET user:1:age "30"
$CLI SET user:2:name "Jane Smith"
$CLI SET user:2:email "jane.smith@example.com"
$CLI SET user:2:age "25"
$CLI SET article:1001 "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt."

# Hash examples
$CLI HSET user:1:profile name "John Doe" email "john.doe@example.com" age 30 city "New York" occupation "Software Engineer"
$CLI HSET user:2:profile name "Jane Smith" email "jane.smith@example.com" age 25 city "San Francisco" occupation "Data Scientist"
$CLI HSET user:3:profile name "Bob Johnson" email "bob.johnson@example.com" age 35 city "Chicago" occupation "Product Manager"

# List examples
$CLI LPUSH user:1:tasks "Complete project documentation"
$CLI LPUSH user:1:tasks "Review pull requests"
$CLI LPUSH user:1:tasks "Attend team meeting"
$CLI LPUSH user:2:tasks "Analyze user data"
$CLI LPUSH user:2:tasks "Create dashboard"
$CLI LPUSH user:2:tasks "Present findings"

# Set examples (unique items)
$CLI SADD programming:languages "JavaScript"
$CLI SADD programming:languages "Python"
$CLI SADD programming:languages "Java"
$CLI SADD programming:languages "TypeScript"
$CLI SADD programming:languages "Go"
$CLI SADD user:1:skills "JavaScript" "TypeScript" "React" "Node.js"
$CLI SADD user:2:skills "Python" "SQL" "Pandas" "TensorFlow"

# Sorted Set examples (with scores)
$CLI ZADD leaderboard 1500 "player1"
$CLI ZADD leaderboard 2300 "player2"
$CLI ZADD leaderboard 1800 "player3"
$CLI ZADD leaderboard 2100 "player4"
$CLI ZADD leaderboard 1200 "player5"

$CLI ZADD quiz:scores 95 "John Doe"
$CLI ZADD quiz:scores 87 "Jane Smith"
$CLI ZADD quiz:scores 92 "Bob Johnson"
$CLI ZADD quiz:scores 78 "Alice Brown"

# Bitmap examples
$CLI SETBIT user:active:2024:01:01 1 1
$CLI SETBIT user:active:2024:01:01 2 1
$CLI SETBIT user:active:2024:01:01 5 1
$CLI SETBIT user:active:2024:01:02 1 1
$CLI SETBIT user:active:2024:01:02 3 1

# HyperLogLog examples (for cardinality estimation)
$CLI PFADD unique:visitors:2024:01:01 "user1" "user2" "user3" "user4" "user5"
$CLI PFADD unique:visitors:2024:01:02 "user3" "user4" "user6" "user7" "user8"

# JSON examples (if Redis Stack/RedisJSON is available)
$CLI SET product:1 '{"id":1,"name":"Laptop","price":999.99,"category":"Electronics","in_stock":true,"specs":{"cpu":"Intel i7","ram":"16GB","storage":"512GB SSD"}}'
$CLI SET product:2 '{"id":2,"name":"Smartphone","price":699.99,"category":"Electronics","in_stock":false,"specs":{"os":"Android","storage":"128GB","camera":"48MP"}}'

# Session data examples
$CLI SET session:abc123 '{"user_id":1,"logged_in_at":"2024-01-01T10:00:00Z","ip":"192.168.1.100","user_agent":"Mozilla/5.0..."}'
$CLI EXPIRE session:abc123 3600

# Cache examples with TTL
$CLI SET cache:weather:newyork '{"temperature":22,"humidity":65,"conditions":"Sunny"}' EX 300
$CLI SET cache:stock:AAPL '{"price":150.25,"change":+2.35,"volume":1000000}' EX 60

# Counter examples
$CLI SET counter:page:views 1500
$CLI SET counter:api:calls:today 25000
$CLI SET counter:user:1:login:attempts 3

# Configuration examples
$CLI HSET config:app name "Beekeeper Studio Demo" version "1.0.0" debug true max_connections 100
$CLI HSET config:features feature_flags '{"dark_mode":true,"beta_features":false,"analytics":true}'

echo "Example data loaded successfully!"
