import { ClerkExpressWithAuth, clerkClient } from "@clerk/clerk-sdk-node";

export const protect = ClerkExpressWithAuth();

export const protectAdmin = async (req, res, next) => {
    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const user = await clerkClient.users.getUser(req.auth.userId);

        if (user.privateMetadata.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Not authorized. Admin role required." });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }
};