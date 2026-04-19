//Importer les modules nécessaires
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

//Importer les routes et le middleware
const { errorHandler } = require("./middleware/errorHandler");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const servicesRoutes = require("./routes/services");
const bookingsRoutes = require("./routes/bookings");
const reviewsRoutes = require("./routes/reviews");
const offersRoutes = require("./routes/offers");
const packagesRoutes = require("./routes/packages");
const invoicesRoutes = require("./routes/invoices");
const commissionsRoutes = require("./routes/commissions");
const reservationDetailsRoutes = require("./routes/reservationDetails");
const trackingRoutes = require("./routes/tracking");
const portfoliosRoutes = require("./routes/portfolios");
const competencesRoutes = require("./routes/competences");
const certificationsRoutes = require("./routes/certifications");
const availabilityRoutes = require("./routes/availability");
const notationsRoutes = require("./routes/notations");
const transactionRoutes = require("./routes/transactions");
const notificationsRoutes = require("./routes/notifications");
const chatbotRoutes = require("./routes/chatbot");

//Créer une application Express
const app = express();

//Configurer les middlewares
const defaultAllowedOrigins = [
	"https://dashboard.servpro.tn",
	"https://app.servpro.tn",
	"https://dashboard.servpro.local",
	"https://app.servpro.local",
	"http://localhost:5173",
	"http://localhost:5174",
];

const allowedOrigins = new Set(
	(process.env.CORS_ORIGINS || defaultAllowedOrigins.join(","))
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean)
);

const corsOptions = {
	origin: (origin, callback) => {
		// Allow server-to-server and CLI requests that do not send Origin.
		const isTrustedServproOrigin = /^https:\/\/[a-z0-9-]+\.servpro\.(tn|local)$/i.test(origin || "");
		const isTrustedLocalhost = /^http:\/\/localhost(?::\d+)?$/i.test(origin || "");

		if (!origin || allowedOrigins.has(origin) || isTrustedServproOrigin || isTrustedLocalhost) {
			callback(null, true);
			return;
		}

		callback(new Error(`CORS blocked for origin: ${origin}`));
	},
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
	optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

//Définir les routes
app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/services", servicesRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/reviews", reviewsRoutes);
app.use("/offers", offersRoutes);
app.use("/packages", packagesRoutes);
app.use("/invoices", invoicesRoutes);
app.use("/commissions", commissionsRoutes);
app.use("/reservation-details", reservationDetailsRoutes);
app.use("/tracking", trackingRoutes);
app.use("/portfolios", portfoliosRoutes);
app.use("/competences", competencesRoutes);
app.use("/certifications", certificationsRoutes);
app.use("/availability", availabilityRoutes);
app.use("/notations", notationsRoutes);
app.use("/transactions", transactionRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/chatbot", chatbotRoutes);

//Configurer le middleware de gestion des erreurs
app.use(errorHandler);

//Exporter l'application Express
module.exports = { app };
