// ======================================
// Chat Yemen Pro
// ======================================

const socket = io();

// المستخدم الحالي
const currentUser = {
    id: localStorage.getItem("user_id"),
    username: localStorage.getItem("username"),
    avatar: localStorage.getItem("avatar") || "/images/default-avatar.png",
    rank: localStorage.getItem("role") || "عضو"
};

let currentRoom = 1;

// ===========================
// الاتصال بالسيرفر
// ===========================

socket.on("connect", () => {

    console.log("Socket Connected");

    socket.emit("register_user", currentUser.id);

    socket.emit("join_room", currentRoom);

});

// ===========================
// إرسال رسالة
// ===========================

function sendMessage() {

    const input = document.getElementById("messageInput");

    const text = input.value.trim();

    if (text === "") return;

    socket.emit("chat_message", {

        room: currentRoom,

        user_id: currentUser.id,

        username: currentUser.username,

        avatar: currentUser.avatar,

        rank: currentUser.rank,

        message: text

    });

    input.value = "";

}

// زر Enter

document
.getElementById("messageInput")
.addEventListener("keypress", e => {

    if (e.key === "Enter") {

        sendMessage();

    }

});

// ===========================
// استقبال رسالة
// ===========================

socket.on("chat_message", data => {

    addMessage(data);

});

// ===========================
// رسم الرسالة
// ===========================

function addMessage(data) {

    const box = document.getElementById("messages");

    const mine =
        data.user_id == currentUser.id;

    box.innerHTML += `

<div class="message ${mine ? "mine" : ""}">

<img class="avatar"

src="${data.avatar}">

<div class="bubble">

<div class="username">

${data.rank} ${data.username}

</div>

<div class="message-text">

${data.message}

</div>

<div class="message-time">

${new Date().toLocaleTimeString("ar")}

</div>

</div>

</div>

`;

    box.scrollTop = box.scrollHeight;

}

// ===========================
// تحميل الغرف
// ===========================

async function loadRooms() {

    const res = await fetch("/api/rooms");

    const rooms = await res.json();

    console.log(rooms);

}

loadRooms();
// ======================================
// المتواجدون
// ======================================

socket.on("online_users",(users)=>{

    const box=document.getElementById("usersModal");

    if(!box) return;

    let html="<h2>👥 المتواجدون</h2>";

    users.forEach(user=>{

        html+=`

        <div class="online-user"

        onclick="openProfile('${user.id}')">

            <img src="${user.avatar||'/images/default-avatar.png'}"

            class="avatar">

            <span>

            ${user.username}

            </span>

        </div>

        `;

    });

    box.innerHTML=html;

});

// ======================================
// الإشعارات
// ======================================

let notificationCount=0;

socket.on("notification",(data)=>{

    notificationCount++;

    const badge=document.getElementById("notifyCount");

    if(badge){

        badge.innerHTML=notificationCount;

        badge.style.display="inline-block";

    }

    const box=document.getElementById("notificationsModal");

    if(box){

        box.innerHTML=

        `

        <div class="notify-item">

        🔔 ${data.message}

        </div>

        `

        +

        box.innerHTML;

    }

});

function openNotifications(){

    notificationCount=0;

    const badge=document.getElementById("notifyCount");

    if(badge){

        badge.innerHTML="0";

        badge.style.display="none";

    }

    document.getElementById("notificationsModal")

    .style.display="block";

}

// ======================================
// الإيموجي
// ======================================

const emojis=[

"😀","😁","😂","🤣","😍","😘",

"😎","😭","👍","❤️","🔥","🎉",

"👏","🤝","💙","💚","💛","🧡"

];

function openEmoji(){

    const box=document.getElementById("emojiModal");

    if(!box) return;

    let html="<h3>😊 الإيموجي</h3>";

    emojis.forEach(e=>{

        html+=`

        <span

        class="emoji"

        onclick="addEmoji('${e}')">

        ${e}

        </span>

        `;

    });

    box.innerHTML=html;

    box.style.display="block";

}

function addEmoji(emoji){

    document.getElementById("messageInput").value+=emoji;

    document.getElementById("emojiModal")

    .style.display="none";

}

// ======================================
// تبديل الغرف
// ======================================

function joinRoom(id){

    socket.emit("leave_room",currentRoom);

    currentRoom=id;

    document.getElementById("messages").innerHTML="";

    socket.emit("join_room",currentRoom);

}

// ======================================
// الملف الشخصي
// ======================================

async function openProfile(id){

    try{

        const res=

        await fetch("/api/profile/"+id);

        const user=

        await res.json();

        const box=

        document.getElementById("profileModal");

        box.innerHTML=`

        <img

        class="avatar"

        src="${user.avatar}">

        <h2>${user.username}</h2>

        <p>${user.role}</p>

        <p>${user.bio||""}</p>

        `;

        box.style.display="block";

    }

    catch(err){

        console.log(err);

    }

}

// ======================================
// إغلاق النوافذ
// ======================================

function closeModal(id){

    document.getElementById(id)

    .style.display="none";

}
// ======================================
// رفع الصور
// ======================================

function openUpload(){

    const input=document.createElement("input");

    input.type="file";

    input.accept="image/*";

    input.onchange=async()=>{

        const file=input.files[0];

        if(!file) return;

        const form=new FormData();

        form.append("image",file);

        try{

            const res=await fetch("/api/upload",{

                method:"POST",

                body:form

            });

            const data=await res.json();

            socket.emit("chat_image",{

                room:currentRoom,

                user_id:currentUser.id,

                username:currentUser.username,

                avatar:currentUser.avatar,

                rank:currentUser.rank,

                image:data.url

            });

        }catch(err){

            console.log(err);

        }

    };

    input.click();

}

// استقبال الصور

socket.on("chat_image",(data)=>{

    const box=document.getElementById("messages");

    const mine=data.user_id==currentUser.id;

    box.innerHTML+=`

<div class="message ${mine?"mine":""}">

<img class="avatar"

src="${data.avatar}">

<div class="bubble">

<div class="username">

${data.rank} ${data.username}

</div>

<img

src="${data.image}"

style="max-width:220px;
border-radius:10px;
margin-top:8px;">

<div class="message-time">

${new Date().toLocaleTimeString("ar")}

</div>

</div>

</div>

`;

    box.scrollTop=box.scrollHeight;

});

// ======================================
// الرسائل الصوتية
// ======================================

let recorder;

let audioChunks=[];

async function recordVoice(){

    const stream=

    await navigator.mediaDevices.getUserMedia({

        audio:true

    });

    recorder=new MediaRecorder(stream);

    audioChunks=[];

    recorder.ondataavailable=e=>{

        audioChunks.push(e.data);

    };

    recorder.onstop=async()=>{

        const blob=new Blob(audioChunks);

        const form=new FormData();

        form.append("audio",blob,"voice.webm");

        const res=await fetch("/api/upload/audio",{

            method:"POST",

            body:form

        });

        const data=await res.json();

        socket.emit("voice_message",{

            room:currentRoom,

            user_id:currentUser.id,

            username:currentUser.username,

            avatar:currentUser.avatar,

            audio:data.url

        });

    };

    recorder.start();

    setTimeout(()=>{

        recorder.stop();

    },10000);

}

socket.on("voice_message",(data)=>{

    const box=document.getElementById("messages");

    box.innerHTML+=`

<div class="message">

<img class="avatar"

src="${data.avatar}">

<div class="bubble">

<div class="username">

${data.username}

</div>

<audio controls>

<source

src="${data.audio}">

</audio>

</div>

</div>

`;

    box.scrollTop=box.scrollHeight;

});

// ======================================
// الوضع الليلي
// ======================================

function toggleDarkMode(){

    document.body.classList.toggle("dark");

    localStorage.setItem(

        "dark",

        document.body.classList.contains("dark")

    );

}

if(localStorage.getItem("dark")==="true"){

    document.body.classList.add("dark");

}

// ======================================
// الراديو
// ======================================

let radio=new Audio("/audio/radio.mp3");

function toggleRadio(){

    if(radio.paused){

        radio.play();

    }else{

        radio.pause();

    }

}

// ======================================
// تشغيل وإيقاف أصوات التنبيهات
// ======================================

let soundEnabled=true;

function toggleSound(){

    soundEnabled=!soundEnabled;

}

// ======================================
// إغلاق جميع النوافذ
// ======================================

document.addEventListener("keydown",(e)=>{

    if(e.key==="Escape"){

        document.querySelectorAll(".modal")

        .forEach(m=>m.style.display="none");

    }

});
// ======================================
// الرسائل الخاصة
// ======================================

function openPrivate(){

    document.getElementById("privateModal").style.display="block";

}

async function loadPrivate(){

    try{

        const res=await fetch("/api/private");

        const data=await res.json();

        console.log(data);

    }catch(err){

        console.log(err);

    }

}

// ======================================
// نظام الأصدقاء
// ======================================

async function loadFriends(){

    try{

        const res=await fetch("/api/friends");

        const friends=await res.json();

        console.log(friends);

    }catch(err){

        console.log(err);

    }

}

async function addFriend(id){

    await fetch("/api/friends/add",{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:JSON.stringify({

            friend_id:id

        })

    });

}

// ======================================
// متجر الرتب
// ======================================

function openStore(){

    document.getElementById("storeModal").style.display="block";

}

async function loadStore(){

    try{

        const res=await fetch("/api/store");

        const data=await res.json();

        console.log(data);

    }catch(err){

        console.log(err);

    }

}

// ======================================
// الإعدادات
// ======================================

function openSettings(){

    document.getElementById("settingsModal").style.display="block";

}

function saveSettings(){

    localStorage.setItem(

        "chat_sound",

        soundEnabled

    );

}

// ======================================
// الصفحة الرئيسية
// ======================================

function goHome(){

    location.href="/";

}

// ======================================
// قائمة المستخدمين
// ======================================

function openUsers(){

    document.getElementById("usersModal")

    .style.display="block";

}

// ======================================
// قائمة الغرف
// ======================================

function openRooms(){

    document.getElementById("roomsModal")

    .style.display="block";

}

// ======================================
// ربط الأزرار
// ======================================

document.getElementById("sendBtn")
.addEventListener("click",sendMessage);

document.getElementById("emojiBtn")
.addEventListener("click",openEmoji);

document.getElementById("uploadBtn")
.addEventListener("click",openUpload);

document.getElementById("voiceBtn")
.addEventListener("click",recordVoice);

document.getElementById("notifyBtn")
.addEventListener("click",openNotifications);

document.getElementById("usersBtn")
.addEventListener("click",openUsers);

document.getElementById("roomsBtn")
.addEventListener("click",openRooms);

document.getElementById("privateBtn")
.addEventListener("click",openPrivate);

document.getElementById("storeBtn")
.addEventListener("click",openStore);

document.getElementById("settingsBtn")
.addEventListener("click",openSettings);

document.getElementById("homeBtn")
.addEventListener("click",goHome);

document.getElementById("radioBtn")
.addEventListener("click",toggleRadio);

document.getElementById("soundBtn")
.addEventListener("click",toggleSound);

// ======================================
// بدء تشغيل الصفحة
// ======================================

window.onload=()=>{

    loadRooms();

    loadFriends();

    loadPrivate();

    loadStore();

    if(currentUser.id){

        socket.emit(

            "register_user",

            currentUser.id

        );

    }

    socket.emit(

        "join_room",

        currentRoom

    );

};

console.log("Chat Yemen Pro Loaded Successfully");