/*
    ============================================================
    EV Charging Dashboard — MULTI-USER AUTHENTICATION
    ============================================================

    Ye system localStorage mein multiple users store karta hai.
    Aap + aapke 3 friends sab independently register/login kar sakte hain.

    Storage Structure:
    ------------------
    evUsers   → [{ name, email, phone, password }, ...]  (all accounts)
    evSession → { name, email, loginTime }               (current login)

    NOTE:
    - Ye frontend-only demo system hai.
    - Production mein Spring Boot + MySQL + hashed passwords use karo.
    ============================================================
*/


// ============================================================
// STORAGE KEYS
// ============================================================
const USERS_KEY   = "evUsers";
const SESSION_KEY = "evSession";


// ============================================================
// PASSWORD SHOW / HIDE
// ============================================================
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "🙈";
    } else {
        input.type = "password";
        button.textContent = "👁";
    }
}


// ============================================================
// HELPER: Get All Users (Array)
// ============================================================
function getAllUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        const users = JSON.parse(raw);
        return Array.isArray(users) ? users : [];
    } catch (e) {
        console.warn("Could not parse users. Resetting to empty array.");
        return [];
    }
}


// ============================================================
// HELPER: Save All Users
// ============================================================
function saveAllUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}


// ============================================================
// HELPER: Find User by Email (case-insensitive)
// ============================================================
function findUserByEmail(email) {
    const users = getAllUsers();
    const target = email.trim().toLowerCase();
    return users.find(u => u.email.toLowerCase() === target);
}


// ============================================================
// MIGRATION: Purana single-user data → new multi-user array
// ============================================================
(function migrateOldData() {
    const oldSingle = localStorage.getItem("evUser");

    if (oldSingle) {
        try {
            const oldUser = JSON.parse(oldSingle);
            const users = getAllUsers();

            const alreadyExists = users.some(
                u => u.email.toLowerCase() === oldUser.email.toLowerCase()
            );

            if (!alreadyExists) {
                users.push(oldUser);
                saveAllUsers(users);
                console.log("✅ Migrated old user:", oldUser.email);
            }

            localStorage.removeItem("evUser");
            console.log("🗑️ Old 'evUser' key removed.");
        } catch (e) {
            console.warn("Migration failed:", e);
        }
    }
})();


// ============================================================
// REGISTER FORM
// ============================================================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name            = document.getElementById("registerName").value.trim();
        const email           = document.getElementById("registerEmail").value.trim();
        const phone           = document.getElementById("registerPhone").value.trim();
        const password        = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const terms           = document.getElementById("terms").checked;
        const message         = document.getElementById("registerMessage");

        // --- Validation ---
        if (name.length < 2) {
            showMessage(message, "Please enter a valid name.", "error");
            return;
        }

        if (password.length < 6) {
            showMessage(message, "Password must contain at least 6 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(message, "Passwords do not match.", "error");
            return;
        }

        if (!terms) {
            showMessage(message, "Please accept the Terms & Conditions.", "error");
            return;
        }

        // --- Check duplicate email ---
        if (findUserByEmail(email)) {
            showMessage(message, "An account with this email already exists. Please login.", "error");
            return;
        }

        // --- Create new user ---
        const newUser = {
            name: name,
            email: email,
            phone: phone,
            password: password,
            createdAt: new Date().toISOString()
        };

        // --- Append to users array ---
        const users = getAllUsers();
        users.push(newUser);
        saveAllUsers(users);

        console.log("✅ Registered:", email);
        console.log("📊 Total users now:", users.length);

        showMessage(message, "Account created successfully! Redirecting to login...", "success");

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1400);
    });
}


// ============================================================
// LOGIN FORM
// ============================================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email      = document.getElementById("loginEmail").value.trim();
        const password   = document.getElementById("loginPassword").value;
        const rememberMe = document.getElementById("rememberMe").checked;
        const message    = document.getElementById("loginMessage");

        // --- Find user ---
        const user = findUserByEmail(email);

        if (!user) {
            showMessage(message, "No account found with this email. Please register first.", "error");
            return;
        }

        // --- Verify password ---
        if (user.password !== password) {
            showMessage(message, "Invalid email or password.", "error");
            return;
        }

        // --- Create session ---
        const session = {
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString()
        };

        if (rememberMe) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }

        // --- Extra profile data ---
        localStorage.setItem("userName", user.name);
        localStorage.setItem("userEmail", user.email);

        console.log("✅ Login successful:", email);

        showMessage(message, "Login successful! Opening dashboard...", "success");

        setTimeout(function () {
            window.location.href = "index.html";
        }, 1000);
    });
}


// ============================================================
// FORGOT PASSWORD
// ============================================================
function forgotPassword() {
    alert("Password recovery will be connected to the backend later.");
}


// ============================================================
// MESSAGE DISPLAY
// ============================================================
function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = "message " + type;
}


// ============================================================
// PROFILE MENU TOGGLE (Dashboard)
// ============================================================
function toggleProfileMenu() {
    const menu = document.getElementById("profileDropdown");
    if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", function (event) {
    const profile = document.querySelector(".profile-container");
    const menu    = document.getElementById("profileDropdown");

    if (profile && menu && !profile.contains(event.target)) {
        menu.classList.remove("show");
    }
});


// ============================================================
// LOAD USER PROFILE (Dashboard pe naam/email dikhane ke liye)
// ============================================================
function loadUserProfile() {
    let session = null;

    try {
        session =
            JSON.parse(localStorage.getItem(SESSION_KEY)) ||
            JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (e) {
        session = null;
    }

    const userName =
        (session && session.name) ||
        localStorage.getItem("userName") ||
        "User";

    const userEmail =
        (session && session.email) ||
        localStorage.getItem("userEmail") ||
        "user@email.com";

    const nameEl       = document.getElementById("profileName");
    const dropNameEl   = document.getElementById("dropdownName");
    const dropEmailEl  = document.getElementById("dropdownEmail");
    const avatarEl     = document.getElementById("profileAvatar");
    const dropAvatarEl = document.getElementById("dropdownAvatar");

    if (nameEl)       nameEl.textContent = userName;
    if (dropNameEl)   dropNameEl.textContent = userName;
    if (dropEmailEl)  dropEmailEl.textContent = userEmail;

    const initial = userName.charAt(0).toUpperCase();

    if (avatarEl)     avatarEl.textContent = initial;
    if (dropAvatarEl) dropAvatarEl.textContent = initial;
}


// ============================================================
// MY PROFILE
// ============================================================
function openProfile() {
    alert("Profile page will open here.");
}


// ============================================================
// LOGOUT
// ============================================================
function logoutUser() {
    // Sirf session clear karo (users array safe rahega)
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    sessionStorage.removeItem(SESSION_KEY);

    // ⚠️ IMPORTANT: evUsers ko DELETE NAHI karna!
    // Warna saare accounts gayab ho jayenge.

    console.log("✅ Logged out. All users preserved.");

    window.location.href = "login.html";
}


// ============================================================
// PAGE INIT
// ============================================================
document.addEventListener("DOMContentLoaded", function () {

    loadUserProfile();

    const isDashboard = !!document.getElementById("profileDropdown");

    if (isDashboard) {
        const session =
            localStorage.getItem(SESSION_KEY) ||
            sessionStorage.getItem(SESSION_KEY);

        if (!session) {
            console.log("⚠️ No session — user not logged in.");
            // Enforce login chahiye to ye uncomment karo:
            // window.location.href = "login.html";
        } else {
            console.log("✅ Active session:", JSON.parse(session).email);
        }
    }
});


// ============================================================
// 🧪 DEBUG HELPERS (Console se use karo)
// ============================================================

// Sab users dekho
window.showAllUsers = function () {
    console.table(getAllUsers());
};

// Sab data clear karo (testing ke liye)
window.resetAllData = function () {
    if (confirm("⚠️ Saare users aur sessions delete ho jayenge. Sure?")) {
        localStorage.clear();
        sessionStorage.clear();
        console.log("✅ All data cleared.");
        location.reload();
    }
};