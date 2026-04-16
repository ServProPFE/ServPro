// Seed script to populate the database with sample data
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

// Import models
const { User } = require("../models/User");
const { Service } = require("../models/Service");
const { Booking } = require("../models/Booking");
const { ReservationDetail } = require("../models/ReservationDetail");
const { Review } = require("../models/Review");
const { Offer } = require("../models/Offer");
const { Commission } = require("../models/Commission");
const { Transaction } = require("../models/Transaction");
const { Package } = require("../models/Package");
const { Competence } = require("../models/Competence");
const { Certification } = require("../models/Certification");
const { Tracking } = require("../models/Tracking");
const { Notation } = require("../models/Notation");
const { Portfolio } = require("../models/Portfolio");
const { Availability } = require("../models/Availability");

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  console.log("\n🗑️  Clearing existing data...");
  await User.deleteMany({});
  await Service.deleteMany({});
  await Booking.deleteMany({});
  await ReservationDetail.deleteMany({});
  await Review.deleteMany({});
  await Offer.deleteMany({});
  await Commission.deleteMany({});
  await Transaction.deleteMany({});
  await Package.deleteMany({});
  await Competence.deleteMany({});
  await Certification.deleteMany({});
  await Tracking.deleteMany({});
  await Notation.deleteMany({});
  await Portfolio.deleteMany({});
  await Availability.deleteMany({});
  console.log("✅ Database cleared");
};

// Seed data
const seedData = async () => {
  try {
    await connectDB();
    await clearDatabase();

    // Hash password for all users
    const hashedPassword = await bcrypt.hash("password123", 10);

    console.log("\n👥 Creating users...");
    
    // Create Clients
    const clients = await User.create([
      {
        type: "CLIENT",
        name: "Ahmed Ben Ali",
        email: "ahmed@client.com",
        phone: "+216 98 123 456",
        passwordHash: hashedPassword,
      },
      {
        type: "CLIENT",
        name: "Fatima Mansour",
        email: "fatima@client.com",
        phone: "+216 98 234 567",
        passwordHash: hashedPassword,
      },
      {
        type: "CLIENT",
        name: "Mohamed Trabelsi",
        email: "mohamed@client.com",
        phone: "+216 98 345 678",
        passwordHash: hashedPassword,
      },
    ]);
    console.log(`✅ Created ${clients.length} clients`);

    // Create Providers
    const providers = await User.create([
      {
        type: "PROVIDER",
        name: "Hassan El Plombier",
        email: "hassan@provider.com",
        phone: "+216 98 456 789",
        passwordHash: hashedPassword,
        providerProfile: {
          companyName: "Hassan Plomberie Services",
          license: "PLB-2024-001",
          insurance: "INS-PLB-123456",
          experienceYears: 8,
          serviceRadius: 50,
          verificationStatus: "VERIFIED",
        },
      },
      {
        type: "PROVIDER",
        name: "Karim El Electricien",
        email: "karim@provider.com",
        phone: "+216 98 567 890",
        passwordHash: hashedPassword,
        providerProfile: {
          companyName: "Karim Électricité Pro",
          license: "ELEC-2024-002",
          insurance: "INS-ELEC-234567",
          experienceYears: 12,
          serviceRadius: 30,
          verificationStatus: "VERIFIED",
        },
      },
      {
        type: "PROVIDER",
        name: "Salah Climatisation",
        email: "salah@provider.com",
        phone: "+216 98 678 901",
        passwordHash: hashedPassword,
        providerProfile: {
          companyName: "Salah Clim Services",
          license: "CLIM-2024-003",
          insurance: "INS-CLIM-345678",
          experienceYears: 10,
          serviceRadius: 40,
          verificationStatus: "VERIFIED",
        },
      },
      {
        type: "PROVIDER",
        name: "Amira Nettoyage",
        email: "amira@provider.com",
        phone: "+216 98 789 012",
        passwordHash: hashedPassword,
        providerProfile: {
          companyName: "Amira Clean Pro",
          license: "CLEAN-2024-004",
          insurance: "INS-CLEAN-456789",
          experienceYears: 5,
          serviceRadius: 25,
          verificationStatus: "VERIFIED",
        },
      },
      {
        type: "PROVIDER",
        name: "Youssef Multi-Services",
        email: "youssef@provider.com",
        phone: "+216 98 890 123",
        passwordHash: hashedPassword,
        providerProfile: {
          companyName: "Youssef Services Généraux",
          license: "MULTI-2024-005",
          insurance: "INS-MULTI-567890",
          experienceYears: 15,
          serviceRadius: 60,
          verificationStatus: "VERIFIED",
        },
      },
    ]);
    console.log(`✅ Created ${providers.length} providers`);

    // Create Admin
    await User.create({
      type: "ADMIN",
      name: "Admin User",
      email: "admin@servpro.com",
      phone: "+216 98 000 000",
      passwordHash: hashedPassword,
    });
    console.log("✅ Created admin user");

    console.log("\n🛠️  Creating services...");
    
    // Services for each provider
    const services = await Service.create([
      // Hassan - Plomberie
      {
        provider: providers[0]._id,
        name: "serviceNames.waterLeakRepair",
        category: "PLOMBERIE",
        priceMin: 50,
        duration: 60,
        currency: "TND",
      },
      {
        provider: providers[0]._id,
        name: "serviceNames.completeSanitaryInstallation",
        category: "PLOMBERIE",
        priceMin: 200,
        duration: 180,
        currency: "TND",
      },
      {
        provider: providers[0]._id,
        name: "serviceNames.pipeCleaning",
        category: "PLOMBERIE",
        priceMin: 40,
        duration: 45,
        currency: "TND",
      },
      
      // Karim - Électricité
      {
        provider: providers[1]._id,
        name: "serviceNames.electricalInstallation",
        category: "ELECTRICITE",
        priceMin: 300,
        duration: 240,
        currency: "TND",
      },
      {
        provider: providers[1]._id,
        name: "serviceNames.electricityRepair",
        category: "ELECTRICITE",
        priceMin: 60,
        duration: 90,
        currency: "TND",
      },
      {
        provider: providers[1]._id,
        name: "serviceNames.electricalPanelUpgrade",
        category: "ELECTRICITE",
        priceMin: 150,
        duration: 120,
        currency: "TND",
      },
      
      // Salah - Climatisation
      {
        provider: providers[2]._id,
        name: "serviceNames.acInstallation",
        category: "CLIMATISATION",
        priceMin: 400,
        duration: 180,
        currency: "TND",
      },
      {
        provider: providers[2]._id,
        name: "serviceNames.acMaintenance",
        category: "CLIMATISATION",
        priceMin: 80,
        duration: 60,
        currency: "TND",
      },
      {
        provider: providers[2]._id,
        name: "serviceNames.acRepair",
        category: "CLIMATISATION",
        priceMin: 100,
        duration: 90,
        currency: "TND",
      },
      
      // Amira - Nettoyage
      {
        provider: providers[3]._id,
        name: "serviceNames.apartmentCleaning",
        category: "NETTOYAGE",
        priceMin: 70,
        duration: 120,
        currency: "TND",
      },
      {
        provider: providers[3]._id,
        name: "serviceNames.postConstructionCleaning",
        category: "NETTOYAGE",
        priceMin: 120,
        duration: 180,
        currency: "TND",
      },
      {
        provider: providers[3]._id,
        name: "serviceNames.windowCleaning",
        category: "NETTOYAGE",
        priceMin: 50,
        duration: 90,
        currency: "TND",
      },
      
      // Youssef - Multi-services
      {
        provider: providers[4]._id,
        name: "serviceNames.urgentRepair",
        category: "AUTRE",
        priceMin: 80,
        duration: 60,
        currency: "TND",
      },
      {
        provider: providers[4]._id,
        name: "serviceNames.handymanTasks",
        category: "AUTRE",
        priceMin: 45,
        duration: 90,
        currency: "TND",
      },
    ]);
    console.log(`✅ Created ${services.length} services`);

    console.log("\n🖼️  Creating portfolios...");

    const portfolios = await Portfolio.create([
      {
        title: "Kitchen Pipe Refurbishment",
        images: [
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
          "https://images.unsplash.com/photo-1621905252472-e8f0fcf8f1b5",
        ],
        description: "Full replacement of damaged kitchen piping with leak-proof fittings.",
        provider: providers[0]._id,
      },
      {
        title: "Apartment Electrical Panel Upgrade",
        images: [
          "https://images.unsplash.com/photo-1621905251918-48416bd8575a",
        ],
        description: "Modernized circuit breakers and rewiring for improved electrical safety.",
        provider: providers[1]._id,
      },
      {
        title: "Split AC Installation",
        images: [
          "https://images.unsplash.com/photo-1581579186986-5a1863af95aa",
        ],
        description: "Installed and calibrated split AC unit with optimized airflow routing.",
        provider: providers[2]._id,
      },
      {
        title: "Post-Renovation Deep Cleaning",
        images: [
          "https://images.unsplash.com/photo-1585421514738-01798e348b17",
        ],
        description: "Detailed dust extraction, floor sanitization, and glass polishing.",
        provider: providers[3]._id,
      },
    ]);
    console.log(`✅ Created ${portfolios.length} portfolios`);

    console.log("\n📆 Creating availability slots...");

    const availability = await Availability.create([
      { day: 1, start: "08:00", end: "17:00", provider: providers[0]._id },
      { day: 3, start: "09:00", end: "18:00", provider: providers[0]._id },
      { day: 2, start: "08:30", end: "16:30", provider: providers[1]._id },
      { day: 4, start: "10:00", end: "19:00", provider: providers[1]._id },
      { day: 1, start: "09:00", end: "17:30", provider: providers[2]._id },
      { day: 5, start: "08:00", end: "14:00", provider: providers[2]._id },
      { day: 0, start: "08:00", end: "13:00", provider: providers[3]._id },
      { day: 6, start: "08:00", end: "15:00", provider: providers[4]._id },
    ]);
    console.log(`✅ Created ${availability.length} availability slots`);

    console.log("\n🎁 Creating offers...");
    
    // Create some offers with discounts
    const offers = await Offer.create([
      {
        title: "offerTitles.plumberyPromotion",
        basePrice: services[0].priceMin,
        discount: 20,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        active: true,
        service: services[0]._id,
      },
      {
        title: "offerTitles.acOffer",
        basePrice: services[6].priceMin,
        discount: 15,
        validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        active: true,
        service: services[6]._id,
      },
      {
        title: "offerTitles.springCleaning",
        basePrice: services[9].priceMin,
        discount: 25,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        active: true,
        service: services[9]._id,
      },
    ]);
    console.log(`✅ Created ${offers.length} offers`);

    console.log("\n📋 Creating reservation details...");
    
    // Create reservation details
    const reservationDetails = await ReservationDetail.create([
      {
        description: "Water leak in the kitchen sink, needs urgent repair",
        address: "Rue de la République, Tunis",
        urgent: true,
      },
      {
        description: "Installation of a new air conditioner in the living room",
        address: "Avenue Habib Bourguiba, Sfax",
        urgent: false,
      },
      {
        description: "Deep cleaning of the apartment before moving in",
        address: "Rue Ibn Khaldoun, Sousse",
        urgent: false,
      },
      {
        description: "Electrical failure throughout the house, needs immediate attention",
        address: "Avenue de la Liberté, Bizerte",
        urgent: true,
      },
      {
        description: "Clogged drains in the bathroom, requires cleaning",
        address: "Rue Mongi Slim, Nabeul",
        urgent: false,
      },
      {
        description: "Preventive maintenance for air conditioning",
        address: "Avenue Mohamed V, Monastir",
        urgent: false,
      },
    ]);
    console.log(`✅ Created ${reservationDetails.length} reservation details`);

    console.log("\n📅 Creating bookings...");
    
    // Create bookings with different statuses
    const bookings = await Booking.create([
      // DONE - completed booking
      {
        client: clients[0]._id,
        provider: providers[0]._id,
        service: services[0]._id,
        status: "DONE",
        expectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        totalPrice: 50,
        currency: "TND",
        detail: reservationDetails[0]._id,
      },
      // CONFIRMED - will be in progress
      {
        client: clients[1]._id,
        provider: providers[2]._id,
        service: services[6]._id,
        status: "CONFIRMED",
        expectedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        totalPrice: 400,
        currency: "TND",
        detail: reservationDetails[1]._id,
      },
      // DONE - completed booking
      {
        client: clients[2]._id,
        provider: providers[3]._id,
        service: services[9]._id,
        status: "DONE",
        expectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        totalPrice: 70,
        currency: "TND",
        detail: reservationDetails[2]._id,
      },
      // IN_PROGRESS
      {
        client: clients[0]._id,
        provider: providers[1]._id,
        service: services[4]._id,
        status: "IN_PROGRESS",
        expectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        totalPrice: 60,
        currency: "TND",
        detail: reservationDetails[3]._id,
      },
      // PENDING
      {
        client: clients[1]._id,
        provider: providers[0]._id,
        service: services[2]._id,
        status: "PENDING",
        expectedAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        totalPrice: 40,
        currency: "TND",
        detail: reservationDetails[4]._id,
      },
      // CONFIRMED
      {
        client: clients[2]._id,
        provider: providers[2]._id,
        service: services[7]._id,
        status: "CONFIRMED",
        expectedAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        totalPrice: 80,
        currency: "TND",
        detail: reservationDetails[5]._id,
      },
    ]);
    console.log(`✅ Created ${bookings.length} bookings`);

    console.log("\n📦 Creating packages...");

    const packages = await Package.create([
      {
        name: "Starter Home Care",
        months: 3,
        numberVisits: 3,
        monthlyPrice: 99,
      },
      {
        name: "Family Comfort",
        months: 6,
        numberVisits: 8,
        monthlyPrice: 149,
      },
      {
        name: "Premium Assist",
        months: 12,
        numberVisits: 18,
        monthlyPrice: 219,
      },
    ]);
    console.log(`✅ Created ${packages.length} packages`);

    console.log("\n🧠 Creating competences...");

    const competences = await Competence.create([
      {
        serviceId: String(services[0]._id),
        level: "EXPERT",
        provider: providers[0]._id,
      },
      {
        serviceId: String(services[4]._id),
        level: "EXPERT",
        provider: providers[1]._id,
      },
      {
        serviceId: String(services[7]._id),
        level: "INTERMEDIATE",
        provider: providers[2]._id,
      },
      {
        serviceId: String(services[9]._id),
        level: "EXPERT",
        provider: providers[3]._id,
      },
      {
        serviceId: String(services[13]._id),
        level: "INTERMEDIATE",
        provider: providers[4]._id,
      },
    ]);
    console.log(`✅ Created ${competences.length} competences`);

    console.log("\n🎓 Creating certifications...");

    const certifications = await Certification.create([
      {
        name: "Certified Plumbing Technician",
        authority: "Tunisia Skilled Trades Board",
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        provider: providers[0]._id,
      },
      {
        name: "Electrical Safety Specialist",
        authority: "National Electrical Institute",
        expiresAt: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000),
        provider: providers[1]._id,
      },
      {
        name: "HVAC Maintenance Pro",
        authority: "Cooling Systems Academy",
        expiresAt: new Date(Date.now() + 480 * 24 * 60 * 60 * 1000),
        provider: providers[2]._id,
      },
      {
        name: "Professional Cleaning Operator",
        authority: "Home Services Council",
        expiresAt: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        provider: providers[3]._id,
      },
    ]);
    console.log(`✅ Created ${certifications.length} certifications`);

    console.log("\n📍 Creating tracking points...");

    const tracking = await Tracking.create([
      {
        booking: bookings[1]._id,
        position: "Provider left workshop",
        at: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        booking: bookings[3]._id,
        position: "Provider arrived at customer location",
        at: new Date(Date.now() - 10 * 60 * 1000),
      },
      {
        booking: bookings[5]._id,
        position: "Service in progress",
        at: new Date(Date.now() - 5 * 60 * 1000),
      },
    ]);
    console.log(`✅ Created ${tracking.length} tracking points`);

    console.log("\n🧮 Creating notations...");

    const notations = await Notation.create([
      {
        average: 4.8,
        total: 29,
        provider: providers[0]._id,
      },
      {
        average: 4.6,
        total: 22,
        provider: providers[1]._id,
      },
      {
        average: 4.7,
        total: 17,
        provider: providers[2]._id,
      },
      {
        average: 4.5,
        total: 26,
        provider: providers[3]._id,
      },
      {
        average: 4.4,
        total: 14,
        provider: providers[4]._id,
      },
    ]);
    console.log(`✅ Created ${notations.length} notations`);

    console.log("\n⭐ Creating reviews...");
    
    // Create reviews for completed bookings
    const reviews = await Review.create([
      {
        reservation: bookings[0]._id,
        reviewer: clients[0]._id,
        provider: providers[0]._id,
        score: 5,
        comment: "Excellent service! Très professionnel et rapide. Je recommande vivement.",
      },
      {
        reservation: bookings[2]._id,
        reviewer: clients[2]._id,
        provider: providers[3]._id,
        score: 4,
        comment: "Bon travail, appartement bien nettoyé. Pourrait être un peu plus rapide.",
      },
    ]);
    console.log(`✅ Created ${reviews.length} reviews`);

    console.log("\n💼 Creating commissions...");

    const commissions = await Commission.create([
      {
        booking: bookings[0]._id,
        percentage: 15,
        amount: Number((bookings[0].totalPrice * 0.15).toFixed(2)),
      },
      {
        booking: bookings[1]._id,
        percentage: 12,
        amount: Number((bookings[1].totalPrice * 0.12).toFixed(2)),
      },
      {
        booking: bookings[2]._id,
        percentage: 10,
        amount: Number((bookings[2].totalPrice * 0.1).toFixed(2)),
      },
      {
        booking: bookings[5]._id,
        percentage: 14,
        amount: Number((bookings[5].totalPrice * 0.14).toFixed(2)),
      },
    ]);
    console.log(`✅ Created ${commissions.length} commissions`);

    console.log("\n💳 Creating transactions...");
    
    // Create transactions for confirmed/completed bookings
    const transactions = await Transaction.create([
      {
        booking: bookings[0]._id,
        amount: bookings[0].totalPrice,
        currency: "TND",
        method: "CARD",
        status: "SUCCESS",
      },
      {
        booking: bookings[1]._id,
        amount: bookings[1].totalPrice,
        currency: "TND",
        method: "CASH",
        status: "PENDING",
      },
      {
        booking: bookings[2]._id,
        amount: bookings[2].totalPrice,
        currency: "TND",
        method: "PAYPAL",
        status: "SUCCESS",
      },
      {
        booking: bookings[5]._id,
        amount: bookings[5].totalPrice,
        currency: "TND",
        method: "KNET",
        status: "SUCCESS",
      },
    ]);
    console.log(`✅ Created ${transactions.length} transactions`);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ DATABASE SEEDED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log("\n📊 Summary:");
    console.log(`   • ${clients.length} Clients`);
    console.log(`   • ${providers.length} Providers`);
    console.log(`   • 1 Admin`);
    console.log(`   • ${services.length} Services`);
    console.log(`   • ${portfolios.length} Portfolios`);
    console.log(`   • ${availability.length} Availability slots`);
    console.log(`   • ${offers.length} Offers`);
    console.log(`   • ${packages.length} Packages`);
    console.log(`   • ${competences.length} Competences`);
    console.log(`   • ${certifications.length} Certifications`);
    console.log(`   • ${tracking.length} Tracking points`);
    console.log(`   • ${notations.length} Notations`);
    console.log(`   • ${bookings.length} Bookings`);
    console.log(`   • ${reviews.length} Reviews`);
    console.log(`   • ${commissions.length} Commissions`);
    console.log(`   • ${transactions.length} Transactions`);
    
    console.log("\n🔐 Login Credentials:");
    console.log("   Password for all users: password123");
    console.log("\n   Clients:");
    console.log("   • ahmed@client.com");
    console.log("   • fatima@client.com");
    console.log("   • mohamed@client.com");
    console.log("\n   Providers:");
    console.log("   • hassan@provider.com (Plomberie)");
    console.log("   • karim@provider.com (Électricité)");
    console.log("   • salah@provider.com (Climatisation)");
    console.log("   • amira@provider.com (Nettoyage)");
    console.log("   • youssef@provider.com (Multi-services)");
    console.log("\n   Admin:");
    console.log("   • admin@servpro.com");
    console.log("\n" + "=".repeat(50) + "\n");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 MongoDB connection closed");
  }
};

// Run the seed script
seedData();
