const bcrypt = require("bcryptjs");
const { User } = require("../models/User");
const { Service } = require("../models/Service");

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
      experienceYears: 5,
      serviceRadius: 25,
      verificationStatus: "VERIFIED",
    },
  },
];

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

const ensureProductionSeedData = async () => {
  if (!shouldRunProductionSeed()) {
    return { seeded: false, reason: "disabled" };
  }

  const defaultPassword = process.env.PRODUCTION_SEED_DEFAULT_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  let usersCreated = 0;
  let servicesCreated = 0;

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

  console.log(`[production-seed] usersCreated=${usersCreated}, servicesCreated=${servicesCreated}`);
  return { seeded: true, usersCreated, servicesCreated };
};

module.exports = {
  ensureProductionSeedData,
};
