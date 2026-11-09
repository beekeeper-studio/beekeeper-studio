import { MongoClient } from "mongodb";

const usersData = [
    { name: 'Alice', age: 25, email: 'alice@example.com' },
    { name: 'Bob', age: 30, email: 'bob@example.com' },
    { name: 'Charlie', age: 35, email: 'charlie@example.com' },
    { name: 'David', age: 40, email: 'david@example.com' },
    { name: 'Eve', age: 45, email: 'eve@example.com' }
];

const jobsData = [
    { title: 'Software Engineer', company: 'Tech Corp', location: 'San Francisco, CA', salary: 120000, type: 'Full-time', postedDate: new Date() },
    { title: 'Data Scientist', company: 'Data Inc', location: 'New York, NY', salary: 110000, type: 'Full-time', postedDate: new Date() },
    { title: 'Product Manager', company: 'Innovate LLC', location: 'Chicago, IL', salary: 130000, type: 'Full-time', postedDate: new Date() },
    { title: 'DevOps Engineer', company: 'Cloud Solutions', location: 'Austin, TX', salary: 115000, type: 'Full-time', postedDate: new Date() },
    { title: 'Frontend Developer', company: 'Web Masters', location: 'Seattle, WA', salary: 105000, type: 'Contract', postedDate: new Date() },
    { title: 'Backend Developer', company: 'API Experts', location: 'Boston, MA', salary: 125000, type: 'Full-time', postedDate: new Date() },
    { title: 'UX Designer', company: 'Design Co', location: 'Los Angeles, CA', salary: 95000, type: 'Part-time', postedDate: new Date() },
    { title: 'QA Engineer', company: 'Quality Assurance Inc', location: 'Denver, CO', salary: 90000, type: 'Full-time', postedDate: new Date() },
    { title: 'System Administrator', company: 'IT Solutions', location: 'Atlanta, GA', salary: 85000, type: 'Full-time', postedDate: new Date() },
    { title: 'Mobile Developer', company: 'App Creators', location: 'Miami, FL', salary: 100000, type: 'Full-time', postedDate: new Date() }
]; 

const addressesData = [
    { street: '123 Yonge St', city: 'Toronto', province: 'ON', postalCode: 'M5B 2H1', country: 'Canada' },
    { street: '456 Rue Sainte-Catherine', city: 'Montreal', province: 'QC', postalCode: 'H3B 1A7', country: 'Canada' },
    { street: '789 Jasper Ave', city: 'Edmonton', province: 'AB', postalCode: 'T5J 1N9', country: 'Canada' },
    { street: '101 Granville St', city: 'Vancouver', province: 'BC', postalCode: 'V6C 1S4', country: 'Canada' },
    { street: '202 Portage Ave', city: 'Winnipeg', province: 'MB', postalCode: 'R3C 0B9', country: 'Canada' },
    { street: '303 Barrington St', city: 'Halifax', province: 'NS', postalCode: 'B3J 1Z8', country: 'Canada' },
    { street: '404 University Ave', city: 'Regina', province: 'SK', postalCode: 'S4P 0A2', country: 'Canada' },
    { street: '505 Main St', city: 'Charlottetown', province: 'PE', postalCode: 'C1A 1B1', country: 'Canada' },
    { street: '606 Queen St', city: 'Fredericton', province: 'NB', postalCode: 'E3B 1C2', country: 'Canada' },
    { street: '707 Confederation Blvd', city: 'Ottawa', province: 'ON', postalCode: 'K1A 0A9', country: 'Canada' }
];

export async function setupDB(url: string) {
  const conn = new MongoClient(url);
  const db = conn.db();

  const users = await db.createCollection('users');
  const jobs = await db.createCollection('jobs');
  const addresses = await db.createCollection('addresses')

  await users.insertMany(usersData);
  await jobs.insertMany(jobsData);
  await addresses.insertMany(addressesData);

  await conn.close(true)
}
