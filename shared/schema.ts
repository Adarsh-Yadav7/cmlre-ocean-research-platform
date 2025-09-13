import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("researcher"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Species table for biodiversity data
export const species = pgTable("species", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scientificName: text("scientific_name").notNull(),
  commonName: text("common_name"),
  family: text("family"),
  kingdom: text("kingdom"),
  phylum: text("phylum"),
  class: text("class"),
  order: text("order"),
  genus: text("genus"),
  conservationStatus: text("conservation_status"),
  habitat: text("habitat"),
  depth: text("depth"),
  description: text("description"),
  imageUrl: text("image_url"),
  discoveredAt: timestamp("discovered_at").defaultNow(),
  confidence: real("confidence"),
  verifiedBy: varchar("verified_by").references(() => users.id),
});

// Environmental data from sensors and FORV Sampada
export const environmentalData = pgTable("environmental_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  depth: real("depth"),
  temperature: real("temperature"),
  salinity: real("salinity"),
  ph: real("ph"),
  dissolvedOxygen: real("dissolved_oxygen"),
  chlorophyllA: real("chlorophyll_a"),
  turbidity: real("turbidity"),
  currentSpeed: real("current_speed"),
  currentDirection: real("current_direction"),
  dataSource: text("data_source"), // FORV Sampada, satellite, buoy, etc.
  quality: text("quality").default("good"),
});

// Research missions and expeditions
export const researchMissions = pgTable("research_missions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  vessel: text("vessel").default("FORV Sagar Sampada"),
  leadScientist: varchar("lead_scientist").references(() => users.id),
  objectives: jsonb("objectives"),
  status: text("status").default("planned"),
  region: text("region"),
  maxDepth: real("max_depth"),
  samplesCollected: integer("samples_collected").default(0),
  speciesDiscovered: integer("species_discovered").default(0),
});

// Species observations and sightings
export const speciesObservations = pgTable("species_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  speciesId: varchar("species_id").references(() => species.id),
  missionId: varchar("mission_id").references(() => researchMissions.id),
  timestamp: timestamp("timestamp").defaultNow(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  depth: real("depth"),
  abundance: integer("abundance"),
  behavior: text("behavior"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  aiIdentified: boolean("ai_identified").default(false),
  confidence: real("confidence"),
  verifiedBy: varchar("verified_by").references(() => users.id),
});

// AI model performance tracking
export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // CNN, LSTM, Transformer
  version: text("version").notNull(),
  accuracy: real("accuracy"),
  precision: real("precision"),
  recall: real("recall"),
  f1Score: real("f1_score"),
  trainingData: text("training_data"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  parameters: jsonb("parameters"),
});

// Predictions and alerts
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelId: varchar("model_id").references(() => aiModels.id),
  type: text("type").notNull(), // algal_bloom, temperature_anomaly, fish_migration
  timestamp: timestamp("timestamp").defaultNow(),
  location: jsonb("location"), // {lat, lng, region}
  probability: real("probability"),
  severity: text("severity"), // low, medium, high, critical
  description: text("description"),
  parameters: jsonb("parameters"),
  isActive: boolean("is_active").default(true),
  validUntil: timestamp("valid_until"),
});

// Research publications
export const publications = pgTable("publications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  authors: text("authors").array(),
  journal: text("journal"),
  year: integer("year"),
  doi: text("doi"),
  impactFactor: real("impact_factor"),
  citations: integer("citations").default(0),
  abstract: text("abstract"),
  keywords: text("keywords").array(),
  relatedSpecies: text("related_species").array(),
  publicationType: text("publication_type"),
  isOpenAccess: boolean("is_open_access").default(false),
});

// Data processing jobs
export const dataJobs = pgTable("data_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // ingestion, processing, analysis
  status: text("status").default("pending"), // pending, running, completed, failed
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  dataSource: text("data_source"),
  recordsProcessed: integer("records_processed").default(0),
  errorMessage: text("error_message"),
  parameters: jsonb("parameters"),
  progress: real("progress").default(0),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  species: many(species),
  missions: many(researchMissions),
  observations: many(speciesObservations),
}));

export const speciesRelations = relations(species, ({ one, many }) => ({
  verifiedBy: one(users, {
    fields: [species.verifiedBy],
    references: [users.id],
  }),
  observations: many(speciesObservations),
}));

export const researchMissionsRelations = relations(researchMissions, ({ one, many }) => ({
  leadScientist: one(users, {
    fields: [researchMissions.leadScientist],
    references: [users.id],
  }),
  observations: many(speciesObservations),
}));

export const speciesObservationsRelations = relations(speciesObservations, ({ one }) => ({
  species: one(species, {
    fields: [speciesObservations.speciesId],
    references: [species.id],
  }),
  mission: one(researchMissions, {
    fields: [speciesObservations.missionId],
    references: [researchMissions.id],
  }),
  verifiedBy: one(users, {
    fields: [speciesObservations.verifiedBy],
    references: [users.id],
  }),
}));

export const aiModelsRelations = relations(aiModels, ({ many }) => ({
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  model: one(aiModels, {
    fields: [predictions.modelId],
    references: [aiModels.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertSpeciesSchema = createInsertSchema(species).omit({
  id: true,
  discoveredAt: true,
});

export const insertEnvironmentalDataSchema = createInsertSchema(environmentalData).omit({
  id: true,
  timestamp: true,
});

export const insertResearchMissionSchema = createInsertSchema(researchMissions).omit({
  id: true,
});

export const insertSpeciesObservationSchema = createInsertSchema(speciesObservations).omit({
  id: true,
  timestamp: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  timestamp: true,
});

export const insertPublicationSchema = createInsertSchema(publications).omit({
  id: true,
});

export const insertDataJobSchema = createInsertSchema(dataJobs).omit({
  id: true,
  startTime: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type Species = typeof species.$inferSelect;
export type EnvironmentalData = typeof environmentalData.$inferSelect;
export type ResearchMission = typeof researchMissions.$inferSelect;
export type SpeciesObservation = typeof speciesObservations.$inferSelect;
export type AiModel = typeof aiModels.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type Publication = typeof publications.$inferSelect;
export type DataJob = typeof dataJobs.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSpecies = z.infer<typeof insertSpeciesSchema>;
export type InsertEnvironmentalData = z.infer<typeof insertEnvironmentalDataSchema>;
export type InsertResearchMission = z.infer<typeof insertResearchMissionSchema>;
export type InsertSpeciesObservation = z.infer<typeof insertSpeciesObservationSchema>;
export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type InsertPublication = z.infer<typeof insertPublicationSchema>;
export type InsertDataJob = z.infer<typeof insertDataJobSchema>;
