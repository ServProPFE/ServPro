const bcrypt = require("bcryptjs");
const { User } = require("../models/User");
const { Service } = require("../models/Service");
const { Portfolio } = require("../models/Portfolio");
const { Availability } = require("../models/Availability");

const seedProviders = [
  {
    type: "PROVIDER",
    name: "Hassan El Plombier",
    email: "hassan@provider.com",
    phone: "+216 98 456 789",
    providerProfile: {
      companyName: "Hassan Plomberie Services",
      license: "PLB-2024-001",
      insurance: "INS-PLB-123456",
      location: "Tunis",
      turnover: "120k TND/year",
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
    providerProfile: {
      companyName: "Karim Electricite Pro",
      license: "ELEC-2024-002",
      insurance: "INS-ELEC-234567",
      location: "Sfax",
      turnover: "180k TND/year",
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
    providerProfile: {
      companyName: "Salah Clim Services",
      license: "CLIM-2024-003",
      insurance: "INS-CLIM-345678",
      location: "Sousse",
      turnover: "150k TND/year",
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
    providerProfile: {
      companyName: "Amira Clean Pro",
      license: "CLEAN-2024-004",
      insurance: "INS-CLEAN-456789",
      location: "Bizerte",
      turnover: "95k TND/year",
      experienceYears: 5,
      serviceRadius: 25,
      verificationStatus: "VERIFIED",
    },
  },
];

const providerProfileDefaults = {
  "hassan@provider.com": {
    location: "Tunis",
    turnover: "120k TND/year",
  },
  "karim@provider.com": {
    location: "Sfax",
    turnover: "180k TND/year",
  },
  "salah@provider.com": {
    location: "Sousse",
    turnover: "150k TND/year",
  },
  "amira@provider.com": {
    location: "Bizerte",
    turnover: "95k TND/year",
  },
};

const seedAdmin = {
  type: "ADMIN",
  name: "Admin User",
  email: "admin@servpro.com",
  phone: "+216 98 000 000",
};

const providerServices = {
  "hassan@provider.com": [
    { name: "serviceNames.waterLeakRepair", category: "PLOMBERIE", priceMin: 50, duration: 60, currency: "TND" },
    { name: "serviceNames.pipeCleaning", category: "PLOMBERIE", priceMin: 40, duration: 45, currency: "TND" },
  ],
  "karim@provider.com": [
    { name: "serviceNames.electricityRepair", category: "ELECTRICITE", priceMin: 60, duration: 90, currency: "TND" },
    { name: "serviceNames.electricalPanelUpgrade", category: "ELECTRICITE", priceMin: 150, duration: 120, currency: "TND" },
  ],
  "salah@provider.com": [
    { name: "serviceNames.acMaintenance", category: "CLIMATISATION", priceMin: 80, duration: 60, currency: "TND" },
    { name: "serviceNames.acRepair", category: "CLIMATISATION", priceMin: 100, duration: 90, currency: "TND" },
  ],
  "amira@provider.com": [
    { name: "serviceNames.apartmentCleaning", category: "NETTOYAGE", priceMin: 70, duration: 120, currency: "TND" },
    { name: "serviceNames.windowCleaning", category: "NETTOYAGE", priceMin: 50, duration: 90, currency: "TND" },
  ],
};

const providerPortfolios = {
  "hassan@provider.com": {
    title: "Kitchen Pipe Refurbishment",
    images: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
      "https://images.unsplash.com/photo-1621905252472-e8f0fcf8f1b5",
    ],
    certificates: [
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    ],
    description: "Full replacement of damaged kitchen piping with leak-proof fittings.",
  },
  "karim@provider.com": {
    title: "Apartment Electrical Panel Upgrade",
    images: [
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a",
    ],
    certificates: [
      "https://www.orimi.com/pdf-test.pdf",
    ],
    description: "Modernized circuit breakers and rewiring for improved electrical safety.",
  },
  "salah@provider.com": {
    title: "Split AC Installation",
    images: [
      "https://images.unsplash.com/photo-1581579186986-5a1863af95aa",
    ],
    certificates: [
      "https://www.africau.edu/images/default/sample.pdf",
    ],
    description: "Installed and calibrated split AC unit with optimized airflow routing.",
  },
  "amira@provider.com": {
    title: "Post-Renovation Deep Cleaning",
    images: [
      "https://images.unsplash.com/photo-1585421514738-01798e348b17",
    ],
    certificates: [
      "https://www.clickdimensions.com/links/TestPDFfile.pdf",
    ],
    description: "Detailed dust extraction, floor sanitization, and glass polishing.",
  },
};

const providerAvailability = {
  "hassan@provider.com": [
    { day: 1, start: "08:00", end: "17:00" },
    { day: 3, start: "09:00", end: "18:00" },
  ],
  "karim@provider.com": [
    { day: 2, start: "08:30", end: "16:30" },
    { day: 4, start: "10:00", end: "19:00" },
  ],
  "salah@provider.com": [
    { day: 1, start: "09:00", end: "17:30" },
    { day: 5, start: "08:00", end: "14:00" },
  ],
  "amira@provider.com": [
    { day: 0, start: "08:00", end: "13:00" },
    { day: 6, start: "08:00", end: "15:00" },
  ],
};

const isTruthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const shouldRunProductionSeed = () => {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const explicit = process.env.PRODUCTION_AUTO_SEED;
  if (explicit == null || explicit === "") {
    return true;
  }

  return isTruthy(explicit);
};

const findOrCreateUser = async (payload) => {
  const existing = await User.findOne({ email: payload.email }).lean();
  if (existing) {
    return { user: existing, created: false };
  }

  const created = await User.create(payload);
  return { user: created.toObject(), created: true };
};

const ensureService = async (providerId, serviceDef) => {
  const existing = await Service.findOne({ provider: providerId, name: serviceDef.name }).lean();
  if (existing) {
    return false;
  }

  await Service.create({
    ...serviceDef,
    provider: providerId,
  });
  return true;
};

const ensurePortfolio = async (providerId, portfolioDef) => {
  const existing = await Portfolio.findOne({ provider: providerId, title: portfolioDef.title }).lean();
  if (existing) {
    return false;
  }

  await Portfolio.create({
    ...portfolioDef,
    provider: providerId,
  });
  return true;
};

const ensureAvailability = async (providerId, availabilityDef) => {
  const existing = await Availability.findOne({
    provider: providerId,
    day: availabilityDef.day,
    start: availabilityDef.start,
    end: availabilityDef.end,
  }).lean();

  if (existing) {
    return false;
  }

  await Availability.create({
    ...availabilityDef,
    provider: providerId,
  });
  return true;
};

const seedProviderServices = async (providerMap) => {
  let servicesCreated = 0;

  for (const [email, serviceDefs] of Object.entries(providerServices)) {
    const provider = providerMap[email] || await User.findOne({ email }).lean();
    if (!provider?._id) {
      continue;
    }

    for (const serviceDef of serviceDefs) {
      const created = await ensureService(provider._id, serviceDef);
      if (created) {
        servicesCreated += 1;
      }
    }
  }

  return servicesCreated;
};

const seedProviderPortfolios = async (providerMap) => {
  let portfoliosCreated = 0;

  for (const [email, portfolioDef] of Object.entries(providerPortfolios)) {
    const provider = providerMap[email] || await User.findOne({ email }).lean();
    if (!provider?._id) {
      continue;
    }

    const created = await ensurePortfolio(provider._id, portfolioDef);
    if (created) {
      portfoliosCreated += 1;
    }
  }

  return portfoliosCreated;
};

const seedProviderAvailability = async (providerMap) => {
  let availabilityCreated = 0;

  for (const [email, slots] of Object.entries(providerAvailability)) {
    const provider = providerMap[email] || await User.findOne({ email }).lean();
    if (!provider?._id) {
      continue;
    }

    for (const slot of slots) {
      const created = await ensureAvailability(provider._id, slot);
      if (created) {
        availabilityCreated += 1;
      }
    }
  }

  return availabilityCreated;
};

const resolveProductionSeedPassword = () => {
  return process.env.PRODUCTION_SEED_DEFAULT_PASSWORD || process.env.JWT_SECRET || process.env.PRODUCTION_SEED_PASSWORD || process.env.MONGODB_URI || "";
};

const backfillProviderProfileDefaults = async (providerMap) => {
  let providersUpdated = 0;

  for (const [email, defaults] of Object.entries(providerProfileDefaults)) {
    const provider = providerMap[email] || await User.findOne({ email });
    if (!provider) {
      continue;
    }

    const profile = provider.providerProfile || {};
    const nextProfile = {
      ...profile,
      location: profile.location || defaults.location,
      turnover: profile.turnover || defaults.turnover,
    };

    const profileChanged = nextProfile.location !== profile.location || nextProfile.turnover !== profile.turnover;
    if (!profileChanged) {
      continue;
    }

    await User.updateOne(
      { _id: provider._id },
      { $set: { providerProfile: nextProfile } },
    );
    providersUpdated += 1;
  }

  return providersUpdated;
};

const ensureProductionSeedData = async () => {
  if (!shouldRunProductionSeed()) {
    return { seeded: false, reason: "disabled" };
  }

  const defaultPassword = resolveProductionSeedPassword();
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  let usersCreated = 0;

  const providerMap = {};
  for (const provider of seedProviders) {
    const { user, created } = await findOrCreateUser({
      ...provider,
      passwordHash,
    });
    providerMap[provider.email] = user;
    if (created) {
      usersCreated += 1;
    }
  }

  const { created: adminCreated } = await findOrCreateUser({
    ...seedAdmin,
    passwordHash,
  });
  if (adminCreated) {
    usersCreated += 1;
  }

  const servicesCreated = await seedProviderServices(providerMap);
  const portfoliosCreated = await seedProviderPortfolios(providerMap);
  const availabilityCreated = await seedProviderAvailability(providerMap);
  const providersUpdated = await backfillProviderProfileDefaults(providerMap);

  console.log(`[production-seed] usersCreated=${usersCreated}, servicesCreated=${servicesCreated}, portfoliosCreated=${portfoliosCreated}, availabilityCreated=${availabilityCreated}, providersUpdated=${providersUpdated}`);
  return { seeded: true, usersCreated, servicesCreated, portfoliosCreated, availabilityCreated, providersUpdated };
};

module.exports = {
  ensureProductionSeedData,
};
