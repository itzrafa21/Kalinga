import { initializeApp, getApps } from "firebase/app";
import {
    createUserWithEmailAndPassword,
    getAuth,
    signOut,
    updateProfile,
} from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { app, db } from "./firebase.js";

const TEAM_APP = "kalinga-team-create";

export const TEAM_ROLES = [
    { id: "coordinator", label: "Coordinator" },
    { id: "staff", label: "Staff" },
    { id: "viewer", label: "Viewer" },
];

export function roleLabel(role) {
    return TEAM_ROLES.find((item) => item.id === role)?.label || role || "Staff";
}

export function sanitizeUsername(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "");
}

export function teamLoginEmail(username, orgId) {
    const user = sanitizeUsername(username);
    const orgPart = String(orgId || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 12)
        .toLowerCase();
    return `${user}.${orgPart}@team.kalinga.app`;
}

function teamAuth() {
    const existing = getApps().find((entry) => entry.name === TEAM_APP);
    const secondary = existing || initializeApp(app.options, TEAM_APP);
    return getAuth(secondary);
}

export async function listOrgTeam(orgId) {
    const snap = await getDocs(collection(db, "organizations", orgId, "team"));
    return snap.docs
        .map((entry) => ({ id: entry.id, ...entry.data() }))
        .sort((a, b) =>
            String(a.name || a.username).localeCompare(String(b.name || b.username))
        );
}

export async function createOrgTeamMember(
    orgId,
    { name, username, password, role, createdBy }
) {
    const cleanName = String(name || "").trim();
    const cleanUsername = sanitizeUsername(username);
    const cleanPassword = String(password || "");
    const cleanRole = TEAM_ROLES.some((item) => item.id === role) ? role : "staff";

    if (!cleanName) throw new Error("Enter the person's name.");
    if (cleanUsername.length < 3) {
        throw new Error("Username must be at least 3 characters.");
    }
    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
        throw new Error(
            "Username can only use letters, numbers, dots, dashes, and underscores."
        );
    }
    if (cleanPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
    }

    const usernameRef = doc(db, "org_team_usernames", cleanUsername);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
        throw new Error("That username is already taken.");
    }

    const email = teamLoginEmail(cleanUsername, orgId);
    const secondary = teamAuth();
    let authUid = null;

    try {
        const cred = await createUserWithEmailAndPassword(
            secondary,
            email,
            cleanPassword
        );
        authUid = cred.user.uid;
        try {
            await updateProfile(cred.user, { displayName: cleanName });
        } catch {
            /* display name is also on the team record */
        }
        await signOut(secondary);
    } catch (error) {
        if (error?.code === "auth/email-already-in-use") {
            throw new Error(
                "That username is already linked to a login. Choose another."
            );
        }
        throw error;
    }

    const now = new Date().toISOString();
    const record = {
        name: cleanName,
        username: cleanUsername,
        email,
        role: cleanRole,
        status: "active",
        authUid,
        orgId,
        createdBy: createdBy || orgId,
        createdAt: now,
        updatedAt: now,
    };

    await setDoc(doc(db, "organizations", orgId, "team", authUid), record);
    await setDoc(usernameRef, {
        username: cleanUsername,
        email,
        orgId,
        authUid,
        status: "active",
        role: cleanRole,
        name: cleanName,
        updatedAt: now,
    });

    return { id: authUid, ...record };
}

export async function setOrgTeamMemberStatus(orgId, memberId, status) {
    const next = status === "active" ? "active" : "disabled";
    const memberRef = doc(db, "organizations", orgId, "team", memberId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) throw new Error("User not found.");

    const member = memberSnap.data() || {};
    const now = new Date().toISOString();
    await updateDoc(memberRef, { status: next, updatedAt: now });

    if (member.username) {
        const usernameRef = doc(
            db,
            "org_team_usernames",
            sanitizeUsername(member.username)
        );
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists() && usernameSnap.data()?.orgId === orgId) {
            await updateDoc(usernameRef, { status: next, updatedAt: now });
        }
    }

    return next;
}

export async function lookupTeamUsername(username) {
    const clean = sanitizeUsername(username);
    if (!clean) return null;
    const snap = await getDoc(doc(db, "org_team_usernames", clean));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

export async function findTeamMembership(user) {
    if (!user?.uid) return null;

    const email = String(user.email || "").trim().toLowerCase();
    if (!email.endsWith("@team.kalinga.app")) return null;

    const local = email.split("@")[0] || "";
    const username = local.includes(".")
        ? local.slice(0, local.lastIndexOf("."))
        : local;
    const indexed = await lookupTeamUsername(username);
    if (!indexed?.orgId) return null;

    const memberId = indexed.authUid || user.uid;
    const memberSnap = await getDoc(
        doc(db, "organizations", indexed.orgId, "team", memberId)
    );
    if (memberSnap.exists()) {
        return {
            orgId: indexed.orgId,
            member: { id: memberSnap.id, ...memberSnap.data() },
        };
    }

    return {
        orgId: indexed.orgId,
        member: { id: memberId, ...indexed },
    };
}
