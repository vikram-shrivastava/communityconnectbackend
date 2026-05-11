import ConnectDB from "./db/index.js";
import dotenv from 'dotenv';
import { app, server } from "./app.js"; // Import 'server' here

dotenv.config({
    path: './.env'
});

ConnectDB()
.then(() => {
    app.on("error", (err) => {
        console.log("ERROR:", err);
        throw err;
    });
    
    // Use server.listen instead of app.listen!
    server.listen(process.env.PORT || 8000, () => {
        console.log(`Server connected at the port: ${process.env.PORT || 8000}`);
    });
})
.catch((err) => {
    console.log('Mongo DB connection failed', err);
});