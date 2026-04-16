# Database Seed Script

This script populates your ServPro database with sample data for testing and development purposes.

## What Gets Seeded

The script creates realistic sample data including:

### 👥 Users (9 total)
- **3 Clients**: Regular users who book services
- **5 Providers**: Service providers across different categories
- **1 Admin**: System administrator

### 🛠️ Services (14 total)
Distributed across 4 main categories:
- **Plomberie** (3 services): Water leak repair, complete installation, drainage
- **Électricité** (3 services): House wiring, electrical repairs, panel installation
- **Climatisation** (3 services): AC installation, maintenance, repairs
- **Nettoyage** (3 services): Complete apartment cleaning, post-construction, window cleaning
- **Autre** (2 services): 24/7 emergency services, general handyman work

### 🎁 Offers (3 total)
Special discount offers:
- Plumbing: 20% off
- Air Conditioning: 15% off
- Cleaning: 25% off

### 📅 Bookings (6 total)
Various booking statuses:
- 2 **DONE**: Completed bookings (eligible for reviews)
- 2 **CONFIRMED**: Upcoming confirmed bookings
- 1 **IN_PROGRESS**: Currently ongoing service
- 1 **PENDING**: Awaiting confirmation

### ⭐ Reviews (2 total)
Customer reviews for completed bookings with ratings and comments

### 💳 Transactions (4 total)
Payment transactions with different methods (CARD, CASH, PAYPAL, KNET)

## How to Use

### Run the Seed Script

```bash
# From the ServProBackend directory
npm run seed
```

### What Happens?
1. ✅ Connects to MongoDB
2. 🗑️ **Clears all existing data** (Users, Services, Bookings, etc.)
3. 📝 Creates fresh sample data
4. 🔌 Closes the database connection

⚠️ **Warning**: This script will **DELETE ALL EXISTING DATA** in your database!

## Login Credentials

All users share the same password for easy testing:

**Password**: `password123`

### Client Accounts
- ahmed@client.com
- fatima@client.com
- mohamed@client.com

### Provider Accounts
- hassan@provider.com (Plomberie)
- karim@provider.com (Électricité)
- salah@provider.com (Climatisation)
- amira@provider.com (Nettoyage)
- youssef@provider.com (Multi-services)

### Admin Account
- admin@servpro.com

## Testing the Chatbot

After seeding, you can test the AI chatbot with queries like:
- "I need a plumber" → Will recommend plumbing services
- "AC repair needed" → Will recommend climatisation services
- "أحتاج كهربائي" (Arabic) → Will recommend electrical services
- "house cleaning" → Will recommend cleaning services

## Sample Data Structure

### Realistic French/Arabic Names
- Tunisian-style names for authenticity
- Phone numbers in Tunisian format (+216)
- Addresses in major Tunisian cities (Tunis, Sfax, Sousse, etc.)

### Services with Proper Pricing
- Prices in TND (Tunisian Dinar)
- Realistic service durations (45-240 minutes)
- Verified providers with licenses and insurance

### Complete Booking Flow
- Past bookings (7 days ago, 3 days ago)
- Current bookings (1 hour ago - in progress)
- Future bookings (tomorrow, 2 days, 5 days from now)

## Customizing the Seed Data

To add more data or modify existing data, edit `seed.js` and adjust the arrays for:
- `clients` array (line ~60)
- `providers` array (line ~80)
- `services` array (line ~150)
- `offers` array (line ~260)
- `bookings` array (line ~320)

Then run `npm run seed` again.

## Troubleshooting

### "MongoDB connection failed"
- Ensure MongoDB is running: `mongod` or check your MongoDB service
- Verify `MONGODB_URI` in `.env` file is correct
- Default: `mongodb://localhost:27017/servpro`

### "Module not found"
```bash
npm install
```

### Database Not Clearing
The script uses `deleteMany({})` which removes all documents. If you have issues:
1. Check database permissions
2. Manually clear: Use MongoDB Compass or `mongo` shell

## Development Tips

### Quick Test Workflow
1. Run seed: `npm run seed`
2. Start server: `npm start`
3. Test API with seeded data
4. Re-seed anytime with `npm run seed`

### Frontend Testing
After seeding, the frontend will immediately have:
- Services to browse and search
- Bookings to display in MyBookings page
- Transactions to show in MyTransactions page
- Reviews visible on service details
- Offers displayed on homepage

### API Testing
Use the seeded data to test endpoints:
```bash
# Login as client
POST /auth/login
{
  "email": "ahmed@client.com",
  "password": "password123"
}

# Get services
GET /services

# Get my bookings (requires auth token)
GET /bookings
```

## Next Steps

After seeding:
1. ✅ Login with any of the provided credentials
2. ✅ Browse services by category
3. ✅ View booking history (clients)
4. ✅ Check transactions
5. ✅ Test the chatbot with service queries
6. ✅ Leave reviews on completed bookings
7. ✅ Create new bookings

---

**Note**: This is test data. In production, use proper data migration tools and never expose default passwords.
