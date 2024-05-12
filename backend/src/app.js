import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "18kb" }));
app.use(express.urlencoded({ extended: true, limit: "18kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// import routes
import userRoutes from "./routes/user.routes.js";
/* import projectRoutes from "./routes/projects.routes.js"; */

// declare routes
app.use("/api/v1/users", userRoutes);
/* app.use("api/v1/projects", projectRoutes); */

export { app };
