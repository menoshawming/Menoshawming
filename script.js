import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, increment, onValue, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

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

let userLocal = null;

// مراقبة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    if (user) {
        hideAllAuth();
        document.getElementById('main-ui').style.display = 'block';
        
        if(!sessionStorage.getItem('guided')) {
            openModal('guide-modal');
            sessionStorage.setItem('guided', 'true');
        }

        onValue(ref(db, 'users/' + user.uid), (s) => {
            userLocal = s.val();
            if(userLocal) {
                document.getElementById('u-bal').innerText = (userLocal.balance || 0).toFixed(2) + " LE";
                document.getElementById('welcome-msg').innerText = "أهلاً، " + (userLocal.name || "عضو جديد");
                document.getElementById('set-name').value = userLocal.name || "";
                document.getElementById('set-sos').value = userLocal.sosCode || "";
            }
        });
        loadItems(); loadChat(); loadSOS();
    } else {
        showLogin();
        document.getElementById('main-ui').style.display = 'none';
    }
});

// وظائف الواجهة
window.showSignup = () => { hideAllAuth(); document.getElementById('signup-screen').style.display='flex'; }
window.showLogin = () => { hideAllAuth(); document.getElementById('auth-screen').style.display='flex'; }
function hideAllAuth() { 
    document.getElementById('auth-screen').style.display='none'; 
    document.getElementById('signup-screen').style.display='none'; 
}
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// تحديث الملف الشخصي
window.updateProfile = async () => {
    await update(ref(db, 'users/' + auth.currentUser.uid), { 
        name: document.getElementById('set-name').value, 
        sosCode: document.getElementById('set-sos').value 
    });
    alert("تم التحديث ✅");
    closeModal('settings-modal');
};

// شحن الرصيد
window.contactWhatsApp = () => {
    window.open(`https://wa.me/201200756998?text=اريد شحن حسابي ID:${auth.currentUser.uid}`, '_blank');
};

// طلب عمل
window.submitWork = async () => {
    const data = {
        school: document.getElementById('w-school').value,
        phone: document.getElementById('w-phone').value,
        grade: document.getElementById('w-grade').value,
        name: userLocal.name,
        uid: auth.currentUser.uid,
        status: "Pending"
    };
    if(!data.school || !data.phone) return alert("اكمل البيانات يا بطل!");
    await push(ref(db, 'work_requests'), data);
    alert("طلبك وصل للمشرفين، انتظر مكالمة العظمة!");
    closeModal('work-modal');
};

// تحميل المنتجات
function loadItems() {
    onValue(ref(db, 'products'), (snap) => {
        let h = '';
        const bought = userLocal?.purchased || [];
        snap.forEach(child => {
            const p = child.val();
            const isOwned = bought.includes(child.key) || p.price === 0;
            h += `<div class="product-card">
                <b>${p.name}</b>
                ${isOwned ? `
                    <div style="margin-top:10px;">
                        ${p.imgLink ? `<img src="${p.imgLink}" style="width:100%; border-radius:10px; border:1px solid #333;">` : ''}
                        ${p.audioLink ? `<audio autoplay controls style="width:100%; height:35px;"><source src="${p.audioLink}"></audio>` : ''}
                        ${p.link ? `<button class="btn" style="background:var(--accent); color:white" onclick="window.open('${p.link}')">فتح</button>` : ''}
                    </div>
                ` : `<button class="btn" style="background:var(--primary); color:#fff" onclick="buy('${child.key}', ${p.price})">شراء (${p.price} LE)</button>`}
            </div>`;
        });
        document.getElementById('products-list').innerHTML = h;
    });
}

// عملية الشراء
window.buy = async (pid, price) => {
    if(userLocal.balance >= price) {
        const p = userLocal.purchased || []; p.push(pid);
        await update(ref(db, 'users/' + auth.currentUser.uid), { balance: increment(-price), purchased: p });
        alert("تم فتح المادة بنجاح!");
    } else alert("رصيدك خلص، اشحن بسرعة!");
};

// إرسال الرسائل
window.sendMsg = () => {
    const txt = document.getElementById('chat-in').value;
    if(txt) push(ref(db, 'chat'), { name: userLocal.name, text: txt, uid: auth.currentUser.uid, time: serverTimestamp() });
    document.getElementById('chat-in').value = "";
};

// تحميل الدردشة
function loadChat() {
    onValue(ref(db, 'chat'), (s) => {
        let h = '';
        s.forEach(c => {
            const m = c.val();
            h += `<div class="msg ${m.uid===auth.currentUser.uid ? 'msg-me' : ''}"><b>${m.name}</b>${m.text}</div>`;
        });
        const b = document.getElementById('chat-msgs'); b.innerHTML = h; b.scrollTop = b.scrollHeight;
    });
}

// نظام SOS
window.activateSOS = () => { 
    document.getElementById('main-ui').style.display='none'; 
    document.getElementById('sos-screen').style.display='block'; 
}

window.checkUnlock = async () => {
    const snap = await get(ref(db, 'users/' + auth.currentUser.uid + '/sosCode'));
    if (snap.exists() && document.getElementById('sos-unlock').value === snap.val()) {
        document.getElementById('sos-screen').style.display='none';
        document.getElementById('main-ui').style.display='block';
    } else alert("لم يتم العثور على نتائج بحث.");
};

function loadSOS() {
    onValue(ref(db, 'settings/fakeArticle'), (s) => {
        if(s.exists()){
            document.getElementById('fake-title').innerText = s.val().title;
            document.getElementById('fake-body').innerText = s.val().content;
        }
    });
}

// التعامل مع الدخول والتسجيل
window.handleAuth = async (type) => {
    const email = (type==='signup' ? document.getElementById('reg-email').value : document.getElementById('login-email').value);
    const pass = (type==='signup' ? document.getElementById('reg-pass').value : document.getElementById('login-pass').value);
    try {
        if(type === 'signup') {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await set(ref(db, 'users/' + res.user.uid), { 
                name: document.getElementById('user-nick').value, 
                sosCode: document.getElementById('user-sos').value, 
                balance: 0, 
                purchased: [] 
            });
        } else await signInWithEmailAndPassword(auth, email, pass);
    } catch(e) { alert(e.message); }
};