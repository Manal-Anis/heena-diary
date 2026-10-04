import { auth, db, googleProvider } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* =========================
   HELPERS
========================= */

const $ = s => document.querySelector(s);

const esc = s =>
    String(s ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

const todayStr = () =>
    new Date(
        Date.now() - new Date().getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

const nowTime = () =>
    new Date().toTimeString().slice(0, 5);

const niceDate = d =>
    new Date(d + "T00:00").toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

const fmtTs = t =>
    t?.toDate ? t.toDate().toLocaleString() : "—";


let entries = [];
let unsub = null;
let editingId = null;
let deletingId = null;


/* =========================
   UI HELPERS
========================= */

function toast(msg) {
    const t = $("#toast");

    if (!t) return;

    t.textContent = msg;
    t.classList.add("show");

    setTimeout(() => {
        t.classList.remove("show");
    }, 2800);
}


const show = id => {
    ["listView", "composeView"].forEach(v => {
        if ($("#" + v)) {
            $("#" + v).hidden = v !== id;
        }
    });
};


const open = id => {
    if ($("#" + id)) {
        $("#" + id).hidden = false;
    }
};


document.addEventListener("click", e => {
    if (
        e.target.matches("[data-close]") ||
        e.target.classList.contains("modal")
    ) {
        document.querySelectorAll(".modal").forEach(m => {
            m.hidden = true;
        });
    }
});


/* =========================
   LOGIN
========================= */

$("#loginForm").addEventListener("submit", async e => {

    e.preventDefault();

    $("#loginErr").textContent = "";

    const email = $("#email").value.trim();
    const password = $("#password").value;

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

    } catch (error) {

        console.error(error);

        $("#loginErr").textContent =
            "That email or password isn't right. Please try again.";
    }
});


/* =========================
   SIGNUP
========================= */

/*
   Signup UI agar index.html mein available ho
   to ye automatically work karega.
*/

const signupForm = $("#signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async e => {

        e.preventDefault();

        const err = $("#signupErr");

        if (err) {
            err.textContent = "";
        }

        const email = $("#signupEmail").value.trim();
        const password = $("#signupPassword").value;
        const confirmPassword =
            $("#signupPassword2")?.value;

        if (
            confirmPassword !== undefined &&
            password !== confirmPassword
        ) {
            if (err) {
                err.textContent =
                    "Passwords do not match.";
            }
            return;
        }

        try {

            const credential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = credential.user;

            await setDoc(
                doc(db, "users", user.uid),
                {
                    email: user.email,
                    role: "user",
                    createdAt: serverTimestamp()
                }
            );

            toast("Account created successfully 💚");

        } catch (error) {

            console.error(error);

            if (err) {

                if (error.code === "auth/email-already-in-use") {
                    err.textContent =
                        "An account with this email already exists.";
                }
                else if (error.code === "auth/weak-password") {
                    err.textContent =
                        "Password must be at least 6 characters.";
                }
                else if (error.code === "auth/invalid-email") {
                    err.textContent =
                        "Please enter a valid email.";
                }
                else {
                    err.textContent =
                        "Couldn't create the account. Please try again.";
                }
            }
        }
    });
}


/* =========================
   GOOGLE LOGIN
========================= */

const googleBtn = $("#googleBtn");

if (googleBtn) {

    googleBtn.addEventListener("click", async () => {

        try {

            const result =
                await signInWithPopup(
                    auth,
                    googleProvider
                );

            const user = result.user;

            const userRef =
                doc(db, "users", user.uid);

            const userSnap =
                await getDoc(userRef);

            if (!userSnap.exists()) {

                await setDoc(
                    userRef,
                    {
                        email: user.email,
                        name: user.displayName || "Heena",
                        role: "user",
                        createdAt: serverTimestamp()
                    }
                );
            }

        } catch (error) {

            console.error(error);

            toast(
                "Google login couldn't be completed."
            );
        }
    });
}


/* =========================
   FORGOT PASSWORD
========================= */

$("#forgotBtn").onclick = async () => {

    const em = $("#email").value.trim();

    if (!em) {

        $("#loginErr").textContent =
            "Enter your email above, then tap Forgot password.";

        return;
    }

    try {

        await sendPasswordResetEmail(
            auth,
            em
        );

        toast(
            "Reset link sent. Check your inbox 💌"
        );

    } catch (error) {

        console.error(error);

        $("#loginErr").textContent =
            "Couldn't send a reset link to that email.";
    }
};


/* =========================
   LOGOUT
========================= */

$("#logoutBtn").onclick = async () => {

    try {

        await signOut(auth);

    } catch (error) {

        console.error(error);
    }
};


/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(auth, async user => {

    $("#loginView").hidden = !!user;
    $("#appView").hidden = !user;

    if (unsub) {

        unsub();
        unsub = null;
    }

    if (!user) {

        entries = [];
        return;
    }


    /* USER DOCUMENT */

    const userRef =
        doc(db, "users", user.uid);

    try {

        const userSnap =
            await getDoc(userRef);

        if (!userSnap.exists()) {

            await setDoc(
                userRef,
                {
                    email: user.email,
                    name: user.displayName || "Heena",
                    role: "user",
                    createdAt: serverTimestamp()
                }
            );
        }

    } catch (error) {

        console.error(
            "User document error:",
            error
        );
    }


    /* DIARY ENTRIES */

    unsub = onSnapshot(

        query(
            collection(db, "diaryEntries"),
            where("userId", "==", user.uid)
        ),

        snap => {

            entries = snap.docs
                .map(d => ({
                    id: d.id,
                    ...d.data()
                }))
                .sort((a, b) =>
                    (
                        b.date + (b.time || "")
                    ).localeCompare(
                        a.date + (a.time || "")
                    )
                );

            render();
        },

        error => {

            console.error(error);

            toast(
                "Couldn't load entries. Check your Firestore rules."
            );
        }
    );


    show("listView");
});


/* =========================
   LIST / SEARCH
========================= */

function render() {

    const q =
        $("#search").value.toLowerCase();

    const d =
        $("#dateFilter").value;

    const list = entries.filter(e =>

        (!d || e.date === d) &&

        (
            !q ||
            `${e.topic} ${e.content}`
                .toLowerCase()
                .includes(q)
        )
    );


    $("#entries").innerHTML = list
        .map(e => `

        <article class="card">

            <div class="date">
                📅 ${esc(niceDate(e.date))}
            </div>

            <h3>
                ${esc(e.topic)}
            </h3>

            <p>
                ${esc(e.content)}
            </p>

            <div class="actions" data-id="${e.id}">

                <button
                    class="btn sm"
                    data-act="read">
                    Read
                </button>

                <button
                    class="btn soft sm"
                    data-act="edit">
                    Edit
                </button>

                <button
                    class="btn danger sm"
                    data-act="del">
                    Delete
                </button>

            </div>

        </article>

    `).join("");


    $("#empty").hidden =
        list.length > 0;
}


["#search", "#dateFilter"].forEach(s => {

    $(s).addEventListener(
        "input",
        render
    );

});


$("#clearBtn").onclick =
$("#allBtn").onclick = () => {

    $("#search").value = "";
    $("#dateFilter").value = "";

    render();

    show("listView");
};


/* =========================
   READ / EDIT / DELETE
========================= */

$("#entries").addEventListener(
    "click",
    e => {

        const b =
            e.target.closest("[data-act]");

        if (!b) return;

        const id =
            b.parentElement.dataset.id;

        const en =
            entries.find(x => x.id === id);

        if (!en) return;


        if (b.dataset.act === "read") {

            $("#rDate").textContent =
                "📅 " +
                niceDate(en.date) +
                (en.time
                    ? " · " + en.time
                    : "");

            $("#rTopic").textContent =
                en.topic;

            $("#rBody").textContent =
                en.content;

            $("#rMeta").textContent =
                `Written ${fmtTs(en.createdAt)} · Last edited ${fmtTs(en.updatedAt)}`;

            open("readModal");

        }

        else if (
            b.dataset.act === "edit"
        ) {

            openCompose(en);

        }

        else {

            deletingId = id;

            $("#delTopic").textContent =
                en.topic;

            open("deleteModal");
        }

    }
);


/* DELETE */

$("#confirmDelete").onclick =
async () => {

    if (!deletingId) return;

    try {

        await deleteDoc(
            doc(
                db,
                "diaryEntries",
                deletingId
            )
        );

        toast(
            "Entry deleted"
        );

    } catch (error) {

        console.error(error);

        toast(
            "Couldn't delete that entry."
        );
    }

    $("#deleteModal").hidden = true;

    deletingId = null;
};


/* =========================
   COMPOSE / EDIT
========================= */

function openCompose(en) {

    editingId =
        en?.id || null;

    $("#composeTitle").textContent =
        en
            ? "Edit your page"
            : "A new page";

    $("#composeHint").textContent =
        en
            ? "Change anything, then save."
            : "Today is yours. Write whatever your heart holds.";

    $("#eDate").value =
        en?.date || todayStr();

    $("#eTopic").value =
        en?.topic || "";

    $("#eContent").value =
        en?.content || "";

    show("composeView");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    $("#eTopic").focus();
}


$("#composeBtn").onclick =
$("#emptyCompose").onclick =
() => openCompose();


$("#cancelBtn").onclick =
() => show("listView");


/* SAVE ENTRY */

$("#entryForm").addEventListener(
    "submit",
    async e => {

        e.preventDefault();

        const data = {

            date: $("#eDate").value,

            topic:
                $("#eTopic").value.trim(),

            content:
                $("#eContent").value.trim()
        };


        if (!data.date ||
            !data.topic ||
            !data.content) {

            toast(
                "Please fill in all fields."
            );

            return;
        }


        try {

            if (editingId) {

                await updateDoc(

                    doc(
                        db,
                        "diaryEntries",
                        editingId
                    ),

                    {
                        ...data,
                        updatedAt:
                            serverTimestamp()
                    }
                );

                toast(
                    "Your page has been updated 💚"
                );

            }

            else {

                const ref =
                    doc(
                        collection(
                            db,
                            "diaryEntries"
                        )
                    );

                await setDoc(
                    ref,
                    {
                        entryId: ref.id,

                        userId:
                            auth.currentUser.uid,

                        ...data,

                        time:
                            nowTime(),

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()
                    }
                );

                toast(
                    "Your memory has been saved 💚"
                );
            }

            editingId = null;

            show("listView");

        } catch (error) {

            console.error(error);

            toast(
                "Couldn't save. Please check your connection and try again."
            );
        }
    }
);


/* =========================
   CHANGE PASSWORD
========================= */

$("#pwBtn").onclick = () => {

    $("#pwForm").reset();

    $("#pwErr").textContent = "";

    open("pwModal");
};


$("#pwForm").addEventListener(
    "submit",
    async e => {

        e.preventDefault();

        const err =
            $("#pwErr");

        err.textContent = "";

        const cur =
            $("#curPw").value;

        const n1 =
            $("#newPw").value;

        const n2 =
            $("#newPw2").value;


        if (n1 !== n2) {

            err.textContent =
                "The new passwords don't match.";

            return;
        }


        if (n1 === cur) {

            err.textContent =
                "Choose a password different from your current one.";

            return;
        }


        try {

            const u =
                auth.currentUser;

            const credential =
                EmailAuthProvider.credential(
                    u.email,
                    cur
                );

            await reauthenticateWithCredential(
                u,
                credential
            );

            await updatePassword(
                u,
                n1
            );


        } catch (error) {

            console.error(error);

            err.textContent =
                "Couldn't update. Check your current password and use 6+ characters.";

            return;
        }


        /* SAFE ACTIVITY LOG
           Password itself is NEVER stored.
        */

        try {

            await addDoc(
                collection(
                    db,
                    "activityLogs"
                ),
                {
                    userId:
                        auth.currentUser.uid,

                    eventType:
                        "Password Changed",

                    date:
                        todayStr(),

                    time:
                        new Date()
                            .toTimeString()
                            .slice(0, 8),

                    createdAt:
                        serverTimestamp(),

                    timestamp:
                        Date.now()
                }
            );

        } catch (error) {

            console.error(
                "Activity log error:",
                error
            );
        }


        $("#pwModal").hidden = true;

        toast(
            "Password updated 🔐"
        );
    }
);