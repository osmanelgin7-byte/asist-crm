import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const port = Number(process.env.PORT ?? 4000);
const { createApp } = await import("./app.js");
const app = createApp();

app.listen(port, () => {
  console.log(`Asist On backend http://localhost:${port}`);
  console.log(`Health: http://localhost:${port}/health`);
});
