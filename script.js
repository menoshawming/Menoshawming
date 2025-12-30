import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { getDatabase, ref, set, get, update, increment, onValue, remove, push } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// إعدادات Firebase

const firebaseConfig = {

    apiKey: "AIzaSyBgd5MkjrAOTtt-hhmuGVCh26klzEMB1ag",

    authDomain: "menoshawming-cb8a2.firebaseapp.com",

    databaseURL: "https://menoshawming-cb8a2-default-rtdb.firebaseio.com",

    projectId: "menoshawming-cb8a2",

    appId: "1:558599729266:web:f8a7799809ebf92eb292eb"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getDatabase(app);

const ADMIN_ID = "jwrC3vw807avqiAW80mIJaxGnWb2"; 

// مراقبة حالة المستخدم

onAuthStateChanged(auth, async (user) => {

    if (user) {

        document.getElementById('auth-screen').style.display = 'none';

        document.getElementById('main-ui').style.display = 'block';

        document.getElementById('u-id').innerText = user.uid;

        document.getElementById('admin-panel').style.display = (user.uid === ADMIN_ID) ? 'block' : 'none';

        if(user.uid === ADMIN_ID) loadRequests();

        onValue(ref(db, 'users/' + user.uid), (s) => {

            if(s.exists()) document.getElementById('u-bal').innerText = (s.val().balance || 0).toFixed(2) + " LE";

        });

        loadItems(user.uid);

    } else {

        document.getElementById('auth-screen').style.display = 'flex';

        document.getElementById('main-ui').style.display = 'none';

    }

});

// وظائف النافذة المنبثقة

window.openModal = (id) => document.getElementById(id).style.display = 'flex';

window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// تقديم طلب عمل

window.submitWork = async () => {

    const data = {

        school: document.getElementById('w-school').value,

        address: document.getElementById('w-address').value,

        admin: document.getElementById('w-admin').value,

        phone: document.getElementById('w-phone').value,

        grade: document.getElementById('w-grade').value,

        uid: auth.currentUser.uid

    };

    if(!data.school || !data.phone) return alert("املاً البيانات");

    await push(ref(db, 'work_requests'), data);

    alert("تم إرسال طلبك بنجاح!");

    closeModal('work-modal');

};

// تحميل طلبات العمل للمسؤول

function loadRequests() {

    onValue(ref(db, 'work_requests'), (snap) => {

        let h = '<h4>طلبات العمل:</h4>';

        snap.forEach(c => {

            const r = c.val();

            h += `<div style="background:#000; padding:10px; margin-bottom:5px; font-size:12px;">

                ${r.school} - ${r.grade} - ${r.phone} <br> UID: ${r.uid}

                <button onclick="delReq('${c.key}')" style="color:red; background:none; border:none; cursor:pointer;">حذف</button>

            </div>`;

        });

        document.getElementById('requests-list').innerHTML = h;

    });

}

window.delReq = (k) => remove(ref(db, 'work_requests/' + k));

// تواصل واتساب

window.contactWhatsApp = () => {

    const userId = auth.currentUser ? auth.currentUser.uid : "غير معروف";

    window.open(`https://wa.me/201552577467?text=ID: ${userId}`, '_blank');

};

// إضافة منتج جديد (أدمن)

window.adminAddProduct = async () => {

    const name = document.getElementById('p-name').value;

    const price = parseFloat(document.getElementById('p-price').value);

    const link = document.getElementById('p-link').value;

    await set(ref(db, 'products/' + Date.now()), { name, price, link });

    alert("تم النشر!");

};

// تحميل المنتجات

function loadItems(uid) {

    onValue(ref(db, 'products'), async (snap) => {

        const uSnap = await get(ref(db, 'users/' + uid));

        const bought = uSnap.val()?.purchased || [];

        let h = '';

        snap.forEach((c) => {

            const p = c.val(); const pid = c.key;

            const owns = bought.includes(pid) || p.price === 0;

            h += `<div class="product-card">

                <h3>${p.name}</h3>

                ${owns ? `<button class="btn" style="background:#238636; color:white" onclick="viewMaterial('${p.link}', '${p.name}')">عرض المادة 👁️</button>` : 

                `<button class="btn" style="background:var(--primary); color:white" onclick="buy('${pid}', ${p.price})">شراء (${p.price} LE)</button>`}

                ${auth.currentUser.uid === ADMIN_ID ? `<button class="btn" style="background:red; color:white; font-size:10px" onclick="del('${pid}')">حذف 🗑️</button>` : ''}

            </div>`;

        });

        document.getElementById('products-list').innerHTML = h || '<p>لا. يوجد تسريبات حاليا..</p>';

    });

}

// عرض المادة في الـ Iframe

window.viewMaterial = (link, name) => {

    let finalLink = link.includes('drive.google.com') ? link.replace('/view', '/preview').split('?')[0] : link;

    document.getElementById('viewer-title').innerText = name;

    document.getElementById('viewer-frame').src = finalLink;

    document.getElementById('viewer-overlay').style.display = 'flex';

};

window.closeViewer = () => {

    document.getElementById('viewer-overlay').style.display = 'none';

    document.getElementById('viewer-frame').src = "";

};

// عملية الشراء

window.buy = async (pid, price) => {

    const r = ref(db, 'users/' + auth.currentUser.uid);

    const s = await get(r);

    const bal = s.val()?.balance || 0;

    if(bal >= price) {

        const p = s.val()?.purchased || []; p.push(pid);

        await update(r, { balance: increment(-price), purchased: p });

        alert("تم الشراء!");

    } else alert("رصيد لا يكفي");

};

// شحن رصيد (أدمن)

window.adminCharge = async () => {

    const id = document.getElementById('adm-u-uid').value;

    const m = parseFloat(document.getElementById('adm-u-amt').value);

    await update(ref(db, 'users/' + id), { balance: increment(m) });

    alert("تم الشحن!");

};

// حذف منتج وتوثيق تسجيل الدخول

window.del = (id) => remove(ref(db, 'products/' + id));

window.handleAuth = (t) => {

    const e = document.getElementById('login-email').value, p = document.getElementById('login-pass').value;

    const f = t === 'login' ? signInWithEmailAndPassword : createUserWithEmailAndPassword;

    f(auth, e, p).catch(err => alert(err.message));

};

window.logout = () => signOut(auth);