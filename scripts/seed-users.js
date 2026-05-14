require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

const Admin = require('../src/models/Admin');
const Producer = require('../src/models/Producer');
const Processor = require('../src/models/Processor');
const Distributor = require('../src/models/Distributor');
const Warehouse = require('../src/models/Warehouse');
const Retailer = require('../src/models/Retailer');

async function upsertUser(Model, email, payload) {
  const doc = await Model.findOneAndUpdate(
    { email },
    { $set: payload },
    { upsert: true, new: true, runValidators: true }
  );
  return doc;
}

async function seedUsers() {
  await connectDB();

  const plainPassword = '123456';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const domains = ['g.g', 'g.com'];

  let primaryAdmin = null;
  for (const domain of domains) {
    const admin = await upsertUser(Admin, `admin@${domain}`, {
      name: 'Admin User',
      email: `admin@${domain}`,
      passwordHash
    });
    if (!primaryAdmin) primaryAdmin = admin;
  }

  const producerTemplates = [
    { prefix: 'producer1', name: 'Producer Farmer', producerType: 'farmer' },
    { prefix: 'producer2', name: 'Producer Wood', producerType: 'wood_collector' },
    { prefix: 'producer3', name: 'Producer Dairy', producerType: 'dairy_meat_producer' }
  ];

  for (const domain of domains) {
    for (const p of producerTemplates) {
      await upsertUser(Producer, `${p.prefix}@${domain}`, {
        name: p.name,
        email: `${p.prefix}@${domain}`,
        passwordHash,
        producerType: p.producerType,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: primaryAdmin._id
      });
    }
  }

  for (const domain of domains) {
    await upsertUser(Processor, `processor@${domain}`, {
      name: 'Processor User',
      email: `processor@${domain}`,
      passwordHash,
      companyName: 'Processor Co'
    });

    await upsertUser(Distributor, `distributor@${domain}`, {
      name: 'Distributor User',
      email: `distributor@${domain}`,
      passwordHash,
      companyName: 'Distributor Co'
    });

    await upsertUser(Warehouse, `warehouse@${domain}`, {
      name: 'Warehouse User',
      email: `warehouse@${domain}`,
      passwordHash,
      warehouseName: 'Main Warehouse',
      location: 'Bhopal'
    });

    await upsertUser(Retailer, `retailer@${domain}`, {
      name: 'Retailer User',
      email: `retailer@${domain}`,
      passwordHash,
      storeName: 'Retail Store',
      storeLocation: 'Bhopal'
    });
  }

  console.log('Seed complete. Users created/updated with password: 123456');
  console.log('Admins: admin@g.g, admin@g.com');
  console.log('Producers: producer1/2/3 @g.g and @g.com (all verified)');
  console.log('Processor: processor@g.g, processor@g.com');
  console.log('Distributor: distributor@g.g, distributor@g.com');
  console.log('Warehouse: warehouse@g.g, warehouse@g.com');
  console.log('Retailer: retailer@g.g, retailer@g.com');
}

seedUsers()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch (_e) {
      // ignore close errors
    }
  });
