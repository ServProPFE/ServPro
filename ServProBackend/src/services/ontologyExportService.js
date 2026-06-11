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
const { Notification } = require("../models/Notification");
const { Invoice } = require("../models/Invoice");

const BASE_IRI = (process.env.ONTOLOGY_BASE_IRI || "http://servpro.local/resource").replace(/\/$/, "");
const PREFIX = "@prefix : <http://servpro.local/ontology#> .\n@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n";

const iriFor = (type, id) => `<${BASE_IRI}/${type}/${id}>`;

const escapeLiteral = (value) => String(value)
  .replaceAll("\\", "\\\\")
  .replaceAll("\n", "\\n")
  .replaceAll('"', '\\"');

const literal = (value) => `"${escapeLiteral(value)}"`;
const typedLiteral = (value, datatype) => `${literal(value)}^^${datatype}`;
const relation = (predicate, object) => `${predicate} ${object} ;`;

const formatSubject = (subject, type, bodyLines) => {
  const lines = [`${subject} a :${type} ;`];
  bodyLines.forEach((line) => lines.push(`  ${line}`));
  const lastIndex = lines.length - 1;
  lines[lastIndex] = `${lines[lastIndex].replace(/;$/, "")} .`;
  return lines.join("\n");
};

const asDateTime = (value) => value ? typedLiteral(new Date(value).toISOString(), "xsd:dateTime") : null;
const asBoolean = (value) => typeof value === "boolean" ? typedLiteral(value ? "true" : "false", "xsd:boolean") : null;
const asInteger = (value) => Number.isFinite(Number(value)) ? typedLiteral(Number(value), "xsd:integer") : null;
const asDecimal = (value) => Number.isFinite(Number(value)) ? typedLiteral(Number(value), "xsd:decimal") : null;

const safeObjectId = (value) => String(value || "");

const buildUserTriples = (user) => {
  const subject = iriFor("user", user._id);
  const type = user.type === "PROVIDER" ? "Provider" : user.type === "ADMIN" ? "Admin" : "Client";
  const triples = [
    relation(":name", literal(user.name || "")),
    relation(":email", literal(user.email || "")),
  ];

  if (user.phone) {
    triples.push(relation(":phone", literal(user.phone)));
  }

  if (user.type === "PROVIDER") {
    const profile = user.providerProfile || {};

    if (profile.companyName) triples.push(relation(":companyName", literal(profile.companyName)));
    if (profile.businessName) triples.push(relation(":businessName", literal(profile.businessName)));
    if (profile.location) triples.push(relation(":location", literal(profile.location)));
    if (profile.address) triples.push(relation(":address", literal(profile.address)));
    if (profile.license) triples.push(relation(":license", literal(profile.license)));
    if (profile.insurance) triples.push(relation(":insurance", literal(profile.insurance)));
    if (profile.verificationStatus) triples.push(relation(":verificationStatus", literal(profile.verificationStatus)));
    if (profile.experienceYears !== undefined) triples.push(relation(":experienceYears", asInteger(profile.experienceYears)));
    if (profile.serviceRadius !== undefined) triples.push(relation(":serviceRadius", asInteger(profile.serviceRadius)));
    if (profile.turnover !== undefined) triples.push(relation(":turnover", literal(profile.turnover)));
  }

  return formatSubject(subject, type, triples);
};

const buildServiceTriples = (service) => {
  const subject = iriFor("service", service._id);
  const triples = [
    relation(":name", literal(service.name || "")),
    relation(":category", literal(service.category || "")),
    relation(":priceMin", asDecimal(service.priceMin || 0)),
    relation(":duration", asInteger(service.duration || 0)),
    relation(":currency", literal(service.currency || "TND")),
  ];

  if (service.description) triples.push(relation(":description", literal(service.description)));
  if (service.provider) triples.push(relation(":hasProvider", iriFor("user", service.provider._id || service.provider)));

  return formatSubject(subject, "Service", triples);
};

const buildBookingTriples = (booking) => {
  const subject = iriFor("booking", booking._id);
  const triples = [
    relation(":status", literal(booking.status || "PENDING")),
    relation(":expectedAt", asDateTime(booking.expectedAt)),
    relation(":totalPrice", asDecimal(booking.totalPrice || 0)),
    relation(":currency", literal(booking.currency || "TND")),
    relation(":bookedBy", iriFor("user", booking.client?._id || booking.client)),
    relation(":servedBy", iriFor("user", booking.provider?._id || booking.provider)),
    relation(":booksService", iriFor("service", booking.service?._id || booking.service)),
    relation(":hasDetail", iriFor("reservation-detail", booking.detail?._id || booking.detail)),
  ];

  return formatSubject(subject, "Booking", triples);
};

const buildReservationDetailTriples = (detail) => formatSubject(
  iriFor("reservation-detail", detail._id),
  "ReservationDetail",
  [
    relation(":description", literal(detail.description || "")),
    relation(":address", literal(detail.address || "")),
    relation(":urgent", asBoolean(Boolean(detail.urgent))),
  ]
);

const buildReviewTriples = (review) => formatSubject(
  iriFor("review", review._id),
  "Review",
  [
    relation(":score", asInteger(review.score || 0)),
    relation(":comment", literal(review.comment || "")),
    relation(":reviewBooking", iriFor("booking", review.reservation?._id || review.reservation)),
    relation(":reviewedBy", iriFor("user", review.reviewer?._id || review.reviewer)),
    relation(":reviewedProvider", iriFor("user", review.provider?._id || review.provider)),
  ]
);

const buildOfferTriples = (offer) => formatSubject(
  iriFor("offer", offer._id),
  "Offer",
  [
    relation(":title", literal(offer.title || "")),
    relation(":basePrice", asDecimal(offer.basePrice || 0)),
    relation(":discount", asDecimal(offer.discount || 0)),
    relation(":validUntil", asDateTime(offer.validUntil)),
    relation(":active", asBoolean(Boolean(offer.active))),
    relation(":service", iriFor("service", offer.service?._id || offer.service)),
  ]
);

const buildPortfolioTriples = (portfolio) => formatSubject(
  iriFor("portfolio", portfolio._id),
  "Portfolio",
  [
    relation(":title", literal(portfolio.title || "")),
    relation(":description", literal(portfolio.description || "")),
    relation(":hasProvider", iriFor("user", portfolio.provider?._id || portfolio.provider)),
  ]
);

const buildCertificationTriples = (certification) => formatSubject(
  iriFor("certification", certification._id),
  "Certification",
  [
    relation(":name", literal(certification.name || "")),
    relation(":authority", literal(certification.authority || "")),
    relation(":imageUrl", literal(certification.imageUrl || "")),
    relation(":expiresAt", asDateTime(certification.expiresAt)),
    relation(":hasProvider", iriFor("user", certification.provider?._id || certification.provider)),
  ]
);

const buildCompetenceTriples = (competence) => formatSubject(
  iriFor("competence", competence._id),
  "Competence",
  [
    relation(":name", literal(competence.serviceId || "")),
    relation(":level", literal(competence.level || "")),
    relation(":hasProvider", iriFor("user", competence.provider?._id || competence.provider)),
  ]
);

const buildAvailabilityTriples = (availability) => formatSubject(
  iriFor("availability", availability._id),
  "Availability",
  [
    relation(":day", asInteger(availability.day || 0)),
    relation(":start", literal(availability.start || "")),
    relation(":end", literal(availability.end || "")),
    relation(":hasProvider", iriFor("user", availability.provider?._id || availability.provider)),
  ]
);

const buildNotationTriples = (notation) => formatSubject(
  iriFor("notation", notation._id),
  "Notation",
  [
    relation(":average", asDecimal(notation.average || 0)),
    relation(":total", asInteger(notation.total || 0)),
    relation(":hasProvider", iriFor("user", notation.provider?._id || notation.provider)),
  ]
);

const buildTransactionTriples = (transaction) => formatSubject(
  iriFor("transaction", transaction._id),
  "Transaction",
  [
    relation(":amount", asDecimal(transaction.amount || 0)),
    relation(":currency", literal(transaction.currency || "TND")),
    relation(":method", literal(transaction.method || "")),
    relation(":status", literal(transaction.status || "PENDING")),
    relation(":provider", literal(transaction.provider || "STRIPE")),
    transaction.externalId ? relation(":externalId", literal(transaction.externalId)) : null,
    relation(":fees", asDecimal(transaction.fees || 0)),
    relation(":providerAmount", asDecimal(transaction.providerAmount || 0)),
    relation(":providerPayoutStatus", literal(transaction.providerPayoutStatus || "PENDING")),
    relation(":transactionBooking", iriFor("booking", transaction.booking?._id || transaction.booking)),
    transaction.commission ? relation(":hasCommission", iriFor("commission", transaction.commission?._id || transaction.commission)) : null,
    transaction.invoice ? relation(":hasInvoice", iriFor("invoice", transaction.invoice?._id || transaction.invoice)) : null,
  ].filter(Boolean)
);

const buildCommissionTriples = (commission) => formatSubject(
  iriFor("commission", commission._id),
  "Commission",
  [
    relation(":percentage", asDecimal(commission.percentage || 0)),
    relation(":amount", asDecimal(commission.amount || 0)),
    commission.booking ? relation(":commissionBooking", iriFor("booking", commission.booking?._id || commission.booking)) : null,
  ].filter(Boolean)
);

const buildInvoiceTriples = (invoice) => formatSubject(
  iriFor("invoice", invoice._id),
  "Invoice",
  [
    relation(":name", literal(invoice.number || "")),
    relation(":totalPrice", asDecimal(invoice.total || 0)),
    relation(":issuedAt", asDateTime(invoice.issuedAt)),
    relation(":invoiceBooking", iriFor("booking", invoice.booking?._id || invoice.booking)),
  ]
);

const buildTrackingTriples = (tracking) => formatSubject(
  iriFor("tracking", tracking._id),
  "Tracking",
  [
    relation(":position", literal(tracking.position || "")),
    relation(":at", asDateTime(tracking.at)),
    relation(":belongsToBooking", iriFor("booking", tracking.booking?._id || tracking.booking)),
  ]
);

const buildNotificationTriples = (notification) => formatSubject(
  iriFor("notification", notification._id),
  "Notification",
  [
    relation(":title", literal(notification.title || "")),
    relation(":type", literal(notification.type || "")),
    relation(":content", literal(notification.content || "")),
    relation(":destination", literal(notification.destination || "")),
    notification.readAt ? relation(":readAt", asDateTime(notification.readAt)) : null,
    relation(":hasRecipient", iriFor("user", notification.recipient?._id || notification.recipient)),
    notification.actor ? relation(":hasActor", iriFor("user", notification.actor?._id || notification.actor)) : null,
  ].filter(Boolean)
);

const buildPackageTriples = (pkg) => formatSubject(
  iriFor("package", pkg._id),
  "Package",
  [
    relation(":name", literal(pkg.name || "")),
    relation(":months", asInteger(pkg.months || 0)),
    relation(":numberVisits", asInteger(pkg.numberVisits || 0)),
    relation(":monthlyPrice", asDecimal(pkg.monthlyPrice || 0)),
  ]
);

const exportOntologySnapshot = async () => {
  const [users, services, bookings, reservationDetails, reviews, offers, commissions, transactions, packages, competences, certifications, tracking, notation, portfolios, availability, notifications, invoices] = await Promise.all([
    User.find({}).lean(),
    Service.find({}).lean(),
    Booking.find({}).lean(),
    ReservationDetail.find({}).lean(),
    Review.find({}).populate("reservation").populate("reviewer").populate("provider").lean(),
    Offer.find({}).populate("service").lean(),
    Commission.find({}).populate("booking").lean(),
    Transaction.find({}).populate("booking").populate("commission").populate("invoice").lean(),
    Package.find({}).lean(),
    Competence.find({}).lean(),
    Certification.find({}).lean(),
    Tracking.find({}).populate("booking").lean(),
    Notation.find({}).lean(),
    Portfolio.find({}).lean(),
    Availability.find({}).lean(),
    Notification.find({}).populate("recipient").populate("actor").lean(),
    Invoice.find({}).populate("booking").lean(),
  ]);

  const blocks = [];

  users.forEach((item) => blocks.push(buildUserTriples(item)));
  services.forEach((item) => blocks.push(buildServiceTriples(item)));
  reservationDetails.forEach((item) => blocks.push(buildReservationDetailTriples(item)));
  bookings.forEach((item) => blocks.push(buildBookingTriples(item)));
  reviews.forEach((item) => blocks.push(buildReviewTriples(item)));
  offers.forEach((item) => blocks.push(buildOfferTriples(item)));
  portfolios.forEach((item) => blocks.push(buildPortfolioTriples(item)));
  certifications.forEach((item) => blocks.push(buildCertificationTriples(item)));
  competences.forEach((item) => blocks.push(buildCompetenceTriples(item)));
  availability.forEach((item) => blocks.push(buildAvailabilityTriples(item)));
  notation.forEach((item) => blocks.push(buildNotationTriples(item)));
  transactions.forEach((item) => blocks.push(buildTransactionTriples(item)));
  commissions.forEach((item) => blocks.push(buildCommissionTriples(item)));
  invoices.forEach((item) => blocks.push(buildInvoiceTriples(item)));
  tracking.forEach((item) => blocks.push(buildTrackingTriples(item)));
  notifications.forEach((item) => blocks.push(buildNotificationTriples(item)));
  packages.forEach((item) => blocks.push(buildPackageTriples(item)));

  return `${PREFIX}${blocks.join("\n\n")}`.trim() + "\n";
};

module.exports = {
  exportOntologySnapshot,
  iriFor,
  safeObjectId,
};
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
const { Notification } = require("../models/Notification");
const { Invoice } = require("../models/Invoice");

const ONTOLOGY_PREFIX = "http://servpro.local/ontology#";
const RESOURCE_BASE_IRI = (process.env.ONTOLOGY_RESOURCE_BASE_IRI || "http://servpro.local/resource/").replace(/\/+$/, "") + "/";

const PREFIXES = [
  `@prefix : <${ONTOLOGY_PREFIX}> .`,
  "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .",
  "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
  "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
].join("\n");

const iri = (segment, id) => `<${RESOURCE_BASE_IRI}${segment}/${encodeURIComponent(String(id))}>`;

const escapeLiteral = (value) => String(value)
  .replace(/\\/g, "\\\\")
  .replace(/"/g, '\\"')
  .replace(/\r?\n/g, "\\n");

const literal = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return `"${value.toISOString()}"^^xsd:dateTime`;
  }

  if (typeof value === "boolean") {
    return `"${value ? "true" : "false"}"^^xsd:boolean`;
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `"${value}"^^xsd:integer`
      : `"${value}"^^xsd:decimal`;
  }

  return `"${escapeLiteral(value)}"`;
};

const resourceRef = (entity, fallbackSegment) => {
  if (!entity) {
    return null;
  }

  if (typeof entity === "string") {
    return iri(fallbackSegment, entity);
  }

  if (entity._id) {
    return iri(fallbackSegment, entity._id);
  }

  return null;
};

const buildBlock = (subject, className, properties) => {
  const entries = properties.filter((entry) => entry && entry.value !== null && entry.value !== undefined);

  if (entries.length === 0) {
    return `${subject} a ${className} .`;
  }

  return [
    `${subject} a ${className} ;`,
    ...entries.map((entry, index) => {
      const suffix = index === entries.length - 1 ? " ." : " ;";
      return `  ${entry.predicate} ${entry.value}${suffix}`;
    }),
  ].join("\n");
};

const fetchOntologySnapshot = async () => {
  const [users, services, bookings, reservationDetails, reviews, offers, commissions, transactions, packages, competences, certifications, trackingEvents, notations, portfolios, availabilitySlots, notifications, invoices] = await Promise.all([
    User.find({}).lean(),
    Service.find({}).populate("provider", "name email phone type providerProfile.companyName providerProfile.businessName providerProfile.address providerProfile.location providerProfile.experienceYears providerProfile.verificationStatus").lean(),
    Booking.find({}).populate("client", "name email phone type").populate("provider", "name email phone type providerProfile.companyName providerProfile.businessName providerProfile.address providerProfile.location providerProfile.experienceYears providerProfile.verificationStatus").populate("service", "name category priceMin duration currency description provider").populate("detail").lean(),
    ReservationDetail.find({}).lean(),
    Review.find({}).populate("reservation", "status expectedAt service provider client").populate("reviewer", "name email phone type").populate("provider", "name email phone type").lean(),
    Offer.find({}).populate("service", "name category priceMin duration currency provider").lean(),
    Commission.find({}).populate("booking", "status expectedAt service provider client").lean(),
    Transaction.find({}).populate({ path: "booking", populate: [
      { path: "service", select: "name category priceMin duration currency provider" },
      { path: "provider", select: "name email phone type" },
      { path: "client", select: "name email phone type" },
    ] }).populate("commission").populate("invoice").lean(),
    Package.find({}).lean(),
    Competence.find({}).populate("provider", "name email phone type").lean(),
    Certification.find({}).populate("provider", "name email phone type").lean(),
    Tracking.find({}).populate("booking", "status expectedAt service provider client").lean(),
    Notation.find({}).populate("provider", "name email phone type").lean(),
    Portfolio.find({}).populate("provider", "name email phone type").lean(),
    Availability.find({}).populate("provider", "name email phone type").lean(),
    Notification.find({}).populate("recipient", "name email phone type").populate("actor", "name email phone type").lean(),
    Invoice.find({}).populate("booking", "status expectedAt service provider client").lean(),
  ]);

  const blocks = [];

  users.forEach((user) => {
    const className = user.type === "PROVIDER" ? ":Provider" : user.type === "ADMIN" ? ":Admin" : ":Client";
    const profile = user.providerProfile || {};
    blocks.push(buildBlock(iri("user", user._id), className, [
      { predicate: ":name", value: literal(user.name) },
      { predicate: ":email", value: literal(user.email) },
      { predicate: ":phone", value: literal(user.phone) },
      { predicate: ":companyName", value: literal(profile.companyName || profile.businessName) },
      { predicate: ":address", value: literal(profile.address) },
      { predicate: ":location", value: literal(profile.location) },
      { predicate: ":experienceYears", value: literal(profile.experienceYears) },
      { predicate: ":verificationStatus", value: literal(profile.verificationStatus) },
    ]));
  });

  services.forEach((service) => {
    const providerRef = resourceRef(service.provider, "user");
    const serviceUri = iri("service", service._id);
    blocks.push(buildBlock(serviceUri, ":Service", [
      { predicate: ":name", value: literal(service.name) },
      { predicate: ":category", value: literal(service.category) },
      { predicate: ":priceMin", value: literal(service.priceMin) },
      { predicate: ":duration", value: literal(service.duration) },
      { predicate: ":currency", value: literal(service.currency) },
      { predicate: ":description", value: literal(service.description) },
      { predicate: ":hasProvider", value: providerRef },
    ]));
  });

  reservationDetails.forEach((detail) => {
    blocks.push(buildBlock(iri("reservation-detail", detail._id), ":ReservationDetail", [
      { predicate: ":description", value: literal(detail.description) },
      { predicate: ":address", value: literal(detail.address) },
      { predicate: ":urgent", value: literal(detail.urgent) },
    ]));
  });

  bookings.forEach((booking) => {
    blocks.push(buildBlock(iri("booking", booking._id), ":Booking", [
      { predicate: ":bookedBy", value: resourceRef(booking.client, "user") },
      { predicate: ":servedBy", value: resourceRef(booking.provider, "user") },
      { predicate: ":booksService", value: resourceRef(booking.service, "service") },
      { predicate: ":hasDetail", value: resourceRef(booking.detail, "reservation-detail") },
      { predicate: ":status", value: literal(booking.status) },
      { predicate: ":expectedAt", value: literal(booking.expectedAt) },
      { predicate: ":totalPrice", value: literal(booking.totalPrice) },
      { predicate: ":currency", value: literal(booking.currency) },
    ]));
  });

  reviews.forEach((review) => {
    blocks.push(buildBlock(iri("review", review._id), ":Review", [
      { predicate: ":forBooking", value: resourceRef(review.reservation, "booking") },
      { predicate: ":reviewedBy", value: resourceRef(review.reviewer, "user") },
      { predicate: ":reviewedProvider", value: resourceRef(review.provider, "user") },
      { predicate: ":score", value: literal(review.score) },
      { predicate: ":content", value: literal(review.comment) },
    ]));
  });

  offers.forEach((offer) => {
    blocks.push(buildBlock(iri("offer", offer._id), ":Offer", [
      { predicate: ":title", value: literal(offer.title) },
      { predicate: ":basePrice", value: literal(offer.basePrice) },
      { predicate: ":discount", value: literal(offer.discount) },
      { predicate: ":validUntil", value: literal(offer.validUntil) },
      { predicate: ":active", value: literal(offer.active) },
      { predicate: ":service", value: resourceRef(offer.service, "service") },
    ]));
  });

  commissions.forEach((commission) => {
    blocks.push(buildBlock(iri("commission", commission._id), ":Commission", [
      { predicate: ":percentage", value: literal(commission.percentage) },
      { predicate: ":amount", value: literal(commission.amount) },
      { predicate: ":forBooking", value: resourceRef(commission.booking, "booking") },
    ]));
  });

  invoices.forEach((invoice) => {
    blocks.push(buildBlock(iri("invoice", invoice._id), ":Invoice", [
      { predicate: ":number", value: literal(invoice.number) },
      { predicate: ":total", value: literal(invoice.total) },
      { predicate: ":issuedAt", value: literal(invoice.issuedAt) },
      { predicate: ":forInvoiceBooking", value: resourceRef(invoice.booking, "booking") },
    ]));
  });

  transactions.forEach((transaction) => {
    blocks.push(buildBlock(iri("transaction", transaction._id), ":Transaction", [
      { predicate: ":hasBooking", value: resourceRef(transaction.booking, "booking") },
      { predicate: ":amount", value: literal(transaction.amount) },
      { predicate: ":currency", value: literal(transaction.currency) },
      { predicate: ":method", value: literal(transaction.method) },
      { predicate: ":status", value: literal(transaction.status) },
      { predicate: ":provider", value: literal(transaction.provider) },
      { predicate: ":externalId", value: literal(transaction.externalId) },
      { predicate: ":fees", value: literal(transaction.fees) },
      { predicate: ":providerAmount", value: literal(transaction.providerAmount) },
      { predicate: ":providerPayoutStatus", value: literal(transaction.providerPayoutStatus) },
      { predicate: ":providerPaidAt", value: literal(transaction.providerPaidAt) },
      { predicate: ":hasCommission", value: resourceRef(transaction.commission, "commission") },
      { predicate: ":hasInvoice", value: resourceRef(transaction.invoice, "invoice") },
    ]));
  });

  packages.forEach((pkg) => {
    blocks.push(buildBlock(iri("package", pkg._id), ":Package", [
      { predicate: ":name", value: literal(pkg.name) },
      { predicate: ":months", value: literal(pkg.months) },
      { predicate: ":numberVisits", value: literal(pkg.numberVisits) },
      { predicate: ":monthlyPrice", value: literal(pkg.monthlyPrice) },
    ]));
  });

  competences.forEach((competence) => {
    blocks.push(buildBlock(iri("competence", competence._id), ":Competence", [
      { predicate: ":serviceId", value: literal(competence.serviceId) },
      { predicate: ":level", value: literal(competence.level) },
      { predicate: ":hasProvider", value: resourceRef(competence.provider, "user") },
    ]));
  });

  certifications.forEach((certification) => {
    blocks.push(buildBlock(iri("certification", certification._id), ":Certification", [
      { predicate: ":name", value: literal(certification.name) },
      { predicate: ":authority", value: literal(certification.authority) },
      { predicate: ":imageUrl", value: literal(certification.imageUrl) },
      { predicate: ":expiresAt", value: literal(certification.expiresAt) },
      { predicate: ":hasProvider", value: resourceRef(certification.provider, "user") },
    ]));
  });

  trackingEvents.forEach((tracking) => {
    blocks.push(buildBlock(iri("tracking", tracking._id), ":Tracking", [
      { predicate: ":belongsToBooking", value: resourceRef(tracking.booking, "booking") },
      { predicate: ":position", value: literal(tracking.position) },
      { predicate: ":at", value: literal(tracking.at) },
    ]));
  });

  notations.forEach((notation) => {
    blocks.push(buildBlock(iri("notation", notation._id), ":Notation", [
      { predicate: ":average", value: literal(notation.average) },
      { predicate: ":total", value: literal(notation.total) },
      { predicate: ":hasProvider", value: resourceRef(notation.provider, "user") },
    ]));
  });

  portfolios.forEach((portfolio) => {
    blocks.push(buildBlock(iri("portfolio", portfolio._id), ":Portfolio", [
      { predicate: ":title", value: literal(portfolio.title) },
      { predicate: ":description", value: literal(portfolio.description) },
      { predicate: ":hasProvider", value: resourceRef(portfolio.provider, "user") },
    ]));
  });

  availabilitySlots.forEach((availability) => {
    blocks.push(buildBlock(iri("availability", availability._id), ":Availability", [
      { predicate: ":day", value: literal(availability.day) },
      { predicate: ":start", value: literal(availability.start) },
      { predicate: ":end", value: literal(availability.end) },
      { predicate: ":hasProvider", value: resourceRef(availability.provider, "user") },
    ]));
  });

  notifications.forEach((notification) => {
    blocks.push(buildBlock(iri("notification", notification._id), ":Notification", [
      { predicate: ":hasRecipient", value: resourceRef(notification.recipient, "user") },
      { predicate: ":hasActor", value: resourceRef(notification.actor, "user") },
      { predicate: ":title", value: literal(notification.title) },
      { predicate: ":type", value: literal(notification.type) },
      { predicate: ":content", value: literal(notification.content) },
      { predicate: ":destination", value: literal(notification.destination) },
      { predicate: ":metadata", value: literal(JSON.stringify(notification.metadata || {})) },
      { predicate: ":readAt", value: literal(notification.readAt) },
    ]));
  });

  return [PREFIXES, ...blocks].join("\n\n");
};

module.exports = {
  fetchOntologySnapshot,
  iri,
  literal,
  resourceRef,
  buildOntologyTurtle: fetchOntologySnapshot,
};