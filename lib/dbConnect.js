import mongoose from "mongoose";

export const dbConnect = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log("Database is already connected.");
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useUnifiedTopology: true,
        });

        console.log("Database connected successfully.");
    } catch (error) {
        console.error("Database connection error:", error.message);
        throw new Error("Failed to connect to the database.");
    }
};
