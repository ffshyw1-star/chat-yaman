const socket = io();

const input = document.querySelector("input");
const send = document.querySelector(".send");
const messages = document.querySelector(".messages");

send.onclick = () => {

    if(input.value.trim()=="") return;

    socket.emit("chat-message",{

        username:JSON.parse(localStorage.user).username,

        text:input.value

    });

    input.value="";

};

socket.on("chat-message",(data)=>{

    const div=document.createElement("div");

    div.className="message";

    div.innerHTML=`
    <div>
        <b>${data.username}</b>
        <p>${data.text}</p>
    </div>
    `;

    messages.appendChild(div);

    messages.scrollTop=messages.scrollHeight;

});