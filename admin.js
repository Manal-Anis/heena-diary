import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const $ = s => document.querySelector(s);

const esc = s =>
    String(s ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

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
let logs = [];
let unsubs = [];


// ===============================
// CLOSE MODAL
// ===============================

document.addEventListener("click", e => {

    if (
        e.target.matches("[data-close]") ||
        e.target.classList.contains("modal")
    ) {
        $("#readModal").hidden = true;
    }

});


// ===============================
// TABS
// ===============================

document.querySelectorAll(".tab").forEach(button => {

    button.onclick = () => {

        document.querySelectorAll(".tab").forEach(tab => {

            tab.classList.toggle("active", tab === button);
            tab.classList.toggle("soft", tab !== button);

        });

        ["entriesTab", "logsTab"].forEach(id => {

            $("#" + id).hidden = id !== button.dataset.tab;

        });

    };

});


// ===============================
// ADMIN LOGIN
// ===============================

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
            "Those details aren't right.";

    }

});


// ===============================
// LOGOUT
// ===============================

$("#logoutBtn").onclick = async () => {

    await signOut(auth);

};


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, async user => {

    // Remove old listeners
    unsubs.forEach(unsubscribe => unsubscribe());
    unsubs = [];

    $("#loginView").hidden = !!user;
    $("#appView").hidden = true;

    if (!user) {
        return;
    }


    // ===============================
    // CHECK ADMIN
    // ===============================

    let isAdmin = false;

    try {

       const userDoc = await getDoc(
    doc(db, "users", user.uid)
);

isAdmin =
    userDoc.exists() &&
    userDoc.data().role === "admin";

    } catch (error) {

        console.error(
            "Admin check failed:",
            error
        );

    }


    // Not an admin
    if (!isAdmin) {

        await signOut(auth);

        $("#loginView").hidden = false;

        $("#loginErr").textContent =
            "This account doesn't have admin access.";

        return;

    }


    // ===============================
    // SHOW ADMIN DASHBOARD
    // ===============================

    $("#appView").hidden = false;


    // ===============================
    // LOAD DIARY ENTRIES
    // ===============================

    const diaryUnsubscribe = onSnapshot(
        collection(db, "diaryEntries"),

        snapshot => {

            entries = snapshot.docs.map(document => ({
                id: document.id,
                ...document.data()
            }));

            fillTopics();
            render();

        },

        error => {

            console.error(
                "Diary entries error:",
                error
            );

        }
    );

    unsubs.push(diaryUnsubscribe);


    // ===============================
    // LOAD PASSWORD ACTIVITY
    // ===============================

    const logsUnsubscribe = onSnapshot(
        collection(db, "activityLogs"),

        snapshot => {

            logs = snapshot.docs
                .map(document => document.data())
                .sort((a, b) => {

                    const timeA =
                        a.createdAt?.toMillis
                            ? a.createdAt.toMillis()
                            : 0;

                    const timeB =
                        b.createdAt?.toMillis
                            ? b.createdAt.toMillis()
                            : 0;

                    return timeB - timeA;

                });


            $("#logs").innerHTML = logs.length

                ? logs.map(log => `

                    <tr>

                        <td>
                            ${esc(log.userId)}
                        </td>

                        <td>
                            <span class="chip">
                                ${esc(log.eventType)}
                            </span>
                        </td>

                        <td>
                            ${esc(log.date)}
                        </td>

                        <td>
                            ${esc(log.time)}
                        </td>

                        <td>
                            ${fmtTs(log.createdAt)}
                        </td>

                    </tr>

                `).join("")

                : `
                    <tr>
                        <td colspan="5"
                            style="text-align:center">
                            No password events yet.
                        </td>
                    </tr>
                `;

        },

        error => {

            console.error(
                "Activity logs error:",
                error
            );

        }
    );

    unsubs.push(logsUnsubscribe);

});


// ===============================
// TOPIC FILTER
// ===============================

function fillTopics() {

    const select = $("#topicFilter");

    const currentValue = select.value;

    const topics = [
        ...new Set(
            entries
                .map(entry => entry.topic)
                .filter(Boolean)
        )
    ].sort();


    select.innerHTML =
        `<option value="">All topics</option>` +

        topics.map(topic => `

            <option
                value="${esc(topic)}"
                ${topic === currentValue ? "selected" : ""}
            >
                ${esc(topic)}
            </option>

        `).join("");

}


// ===============================
// RENDER ENTRIES
// ===============================

function render() {

    const search =
        $("#search").value.toLowerCase().trim();

    const selectedDate =
        $("#dateFilter").value;

    const selectedTopic =
        $("#topicFilter").value;

    const direction =
        $("#order").value === "asc"
            ? 1
            : -1;


    const list = entries

        .filter(entry => {

            const matchesDate =
                !selectedDate ||
                entry.date === selectedDate;


            const matchesTopic =
                !selectedTopic ||
                entry.topic === selectedTopic;


            const matchesSearch =
                !search ||
                `${entry.topic || ""} ${entry.content || ""}`
                    .toLowerCase()
                    .includes(search);


            return (
                matchesDate &&
                matchesTopic &&
                matchesSearch
            );

        })

        .sort((a, b) => {

            const first =
                `${a.date || ""}${a.time || ""}`;

            const second =
                `${b.date || ""}${b.time || ""}`;

            return direction *
                first.localeCompare(second);

        });


    // Statistics

    $("#stats").textContent =
        `${entries.length} diary ${
            entries.length === 1
                ? "entry"
                : "entries"
        }`;


    // Cards

    $("#entries").innerHTML = list.map(entry => `

        <article class="card">

            <div class="date">

                📅 ${esc(niceDate(entry.date))}
                ·
                ${esc(entry.time || "")}

            </div>


            <h3>
                ${esc(entry.topic)}
            </h3>


            <p>
                ${esc(entry.content)}
            </p>


            <div
                class="meta"
                style="margin-bottom:.8rem"
            >

                Created
                ${fmtTs(entry.createdAt)}

                <br>

                Updated
                ${fmtTs(entry.updatedAt)}

            </div>


            <div class="actions">

                <button
                    class="btn sm"
                    data-id="${esc(entry.id)}"
                >
                    Read full entry
                </button>

            </div>

        </article>

    `).join("");


    $("#empty").hidden =
        list.length > 0;

}


// ===============================
// FILTER EVENTS
// ===============================

[
    "#search",
    "#dateFilter",
    "#topicFilter",
    "#order"
].forEach(selector => {

    $(selector).addEventListener(
        "input",
        render
    );

});


// ===============================
// CLEAR FILTERS
// ===============================

$("#clearBtn").onclick = () => {

    $("#search").value = "";
    $("#dateFilter").value = "";
    $("#topicFilter").value = "";

    render();

};


// ===============================
// READ FULL ENTRY
// ===============================

$("#entries").addEventListener(
    "click",
    e => {

        const button =
            e.target.closest("[data-id]");

        if (!button) {
            return;
        }


        const entry =
            entries.find(
                item => item.id === button.dataset.id
            );


        if (!entry) {
            return;
        }


        $("#rDate").textContent =
            `📅 ${niceDate(entry.date)} · ${entry.time || ""}`;


        $("#rTopic").textContent =
            entry.topic || "";


        $("#rBody").textContent =
            entry.content || "";


        $("#rMeta").textContent =
            `Entry ID ${entry.id} · Created ${fmtTs(entry.createdAt)} · Updated ${fmtTs(entry.updatedAt)}`;


        $("#readModal").hidden = false;

    }
);