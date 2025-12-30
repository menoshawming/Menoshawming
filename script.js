import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { getDatabase, ref, set, get, update, increment, onValue, remove } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// Firebase Configuration

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

// مراقبة حالة تسجيل الدخول

onAuthStateChanged(auth, async (user) => {

    const authScreen = document.getElementById('auth-screen');

    const mainUi = document.getElementById('main-ui');

    const uIdLabel = document.getElementById('u-id');

    const adminPanel = document.getElementById('admin-panel');

    if (user) {

        authScreen.style.display = 'none';

        mainUi.style.display = 'block';

        uIdLabel.innerText = user.uid;

        adminPanel.style.display = (user.uid === ADMIN_ID) ? 'block' : 'none';

        

        onValue(ref(db, 'users/' + user.uid), (s) => {

            if(s.exists()) {

                document.getElementById('u-bal').innerText = (s.val().balance || 0).toFixed(2) + " LE";

            }

        });

        loadItems(user.uid);

    } else {

        authScreen.style.display = 'flex';

        mainUi.style.display = 'none';

    }

});

// تحميل المنتجات

function loadItems(uid) {

    onValue(ref(db, 'products'), async (snap) => {

        const uSnap = await get(ref(db, 'users/' + uid));

        const bought = uSnap.val()?.purchased || [];

        let htmlContent = '';

        

        snap.forEach((c) => {

            const p = c.val(); 

            const pid = c.key;

            const owns = bought.includes(pid) || p.price === 0;

            

            htmlContent += `

                <div class="product-card">

                    <h3>${p.name}</h3>

                    ${owns ? 

                        `<button class="btn btn-success" onclick="viewMaterial('${p.link}', '${p.name}')">عرض المادة 👁️</button>` : 

                        `<button class="btn btn-primary" onclick="buyMaterial('${pid}', ${p.price})">شراء (${p.price} LE)</button>`

                    }

                    ${auth.currentUser.uid === ADMIN_ID ? 

                        `<button class="btn btn-delete" onclick="deleteProduct('${pid}')">حذف المادة 🗑️</button>` : ''

                    }

                </div>`;

        });

        document.getElementById('products-list').innerHTML = htmlContent || '<p style="text-align:center; color:gray;">لا توجد مواد متاحة حالياً</p>';

    });

}

// وظائف النافذة المنبثقة

window.viewMaterial = (link, name) => {

    let finalLink = link;

    if(link.includes('drive.google.com') && link.includes('/view')) {

        finalLink = link.replace('/view', '/preview').split('?')[0];

    }

    document.getElementById('viewer-title').innerText = name;

    document.getElementById('viewer-frame').src = finalLink;

    document.getElementById('viewer-overlay').style.display = 'flex';

    document.body.style.overflow = 'hidden';

};

document.getElementById('close-viewer-btn').onclick = () => {

    document.getElementById('viewer-overlay').style.display = 'none';

    document.getElementById('viewer-frame').src = "";

    document.body.style.overflow = 'auto';

};

// عمليات الشراء والشحن

window.buyMaterial = async (pid, price) => {

    const r = ref(db, 'users/' + auth.currentUser.uid);

    const s = await get(r);

    const bal = s.val()?.balance || 0;

    if(bal >= price) {

        const p = s.val()?.purchased || []; 

        p.push(pid);

        await update(r, { balance: increment(-price), purchased: p });

        alert("تم الشراء بنجاح!");

    } else {

        alert("رصيدك لا يكفي! اضغط على زر الشحن.");

    }

};

// الإدارة

document.getElementById('add-product-btn').onclick = async () => {

    const name = document.getElementById('p-name').value;

    const price = parseFloat(document.getElementById('p-price').value);

    const link = document.getElementById('p-link').value;

    if(!name || isNaN(price) || !link) return alert("اكمل البيانات");

    await set(ref(db, 'products/' + Date.now()), { name, price, link });

    alert("تم النشر!");

    location.reload();

};

document.getElementById('charge-btn').onclick = async () => {

    const id = document.getElementById('adm-u-uid').value;

    const m = parseFloat(document.getElementById('adm-u-amt').value);

    if(!id || isNaN(m)) return alert("ادخل البيانات");

    await update(ref(db, 'users/' + id), { balance: increment(m) });

    alert("تم الشحن!");

};

window.deleteProduct = (id) => { 

    if(confirm("هل أنت متأكد من الحذف؟")) remove(ref(db, 'products/' + id)); 

};

// التوثيق والاتصال

document.getElementById('login-btn').onclick = () => handleAuth('login');

document.getElementById('signup-btn').onclick = () => handleAuth('signup');

document.getElementById('logout-btn').onclick = () => signOut(auth);

function handleAuth(type) {

    const email = document.getElementById('login-email').value;

    const pass = document.getElementById('login-pass').value;

    const action = type === 'login' ? signInWithEmailAndPassword : createUserWithEmailAndPassword;

    action(auth, email, pass).catch(err => alert(err.message));

}

document.getElementById('whatsapp-btn').onclick = () => {

    const userId = auth.currentUser ? auth.currentUser.uid : "غير معروف";

    const message = `أريد شحن رصيد في متجر مِنيو.%0Aالـ ID الخاص بي هو: ${userId}`;

    const whatsappNumber = "201113318419";

    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');

};