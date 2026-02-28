import User from "@/models/User";
import mongoose from "mongoose";

/**
 * Returns an array of user IDs that the given user has visibility over.
 * Returns all active users if the user is Admin/HR.
 */
export async function getManagedUserIds(userId: string, role: string, strict: boolean = true): Promise<string[]> {
    const isHRAdmin = ['Admin', 'HR', 'HR Manager'].includes(role);
    const isManager = ['Manager', 'Assigned Manager', 'TL'].includes(role);

    // DEBUG LOG
    console.log(`[Hierarchy] Calculating for ${userId} (${role}), strict=${strict}`);

    // Admins and HR always get to see everyone for monitoring/attendance purposes
    if (isHRAdmin) {
        const allUsers = await User.find({ isActive: true }).select('_id');
        const ids = allUsers.map(u => u._id.toString());
        console.log(`[Hierarchy] Admin/HR bypass: found ${ids.length} users`);
        return ids;
    }

    const managedIdsSet = new Set<string>();
    // Only add self if NOT in strict mode (which is usually for 'My Team' views)
    if (!strict && userId) managedIdsSet.add(userId);

    // If not strict management view, Managers/TLs can also see everyone? 
    // Usually no, but let's follow the 'strict' flag.
    if (!strict && isManager) {
        const allUsers = await User.find({ isActive: true }).select('_id');
        return allUsers.map(u => u._id.toString());
    }

    // Recursive fetch for Managers/TLs
    async function fetchSubordinates(parentIds: string[]) {
        if (!parentIds || parentIds.length === 0) return;

        const subordinates = await User.find({
            $or: [
                { reportingManager: { $in: parentIds } },
                { teamLeader: { $in: parentIds } }
            ],
            _id: { $nin: Array.from(managedIdsSet) }
        }).select('_id');

        if (subordinates.length > 0) {
            const subIds = subordinates.map(u => u._id.toString());
            subIds.forEach(id => managedIdsSet.add(id));
            await fetchSubordinates(subIds);
        }
    }

    try {
        await fetchSubordinates([userId]);
    } catch (err) {
        console.error("[Hierarchy] Error in recursion:", err);
    }

    const finalIds = Array.from(managedIdsSet);
    console.log(`[Hierarchy] Recursive result for ${role}: ${finalIds.length} users`);
    return finalIds;
}
