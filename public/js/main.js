function enterChat(){

let username =
document.getElementById("username").value;


let gender =
document.getElementById("gender").value;


let age =
document.getElementById("age").value;



if(username.trim()===""){

alert("اكتب اسم المستخدم");

return;

}


if(gender===""){

alert("اختر الجنس");

return;

}


if(age===""){

alert("اكتب العمر");

return;

}



localStorage.setItem(
"user",
JSON.stringify({
username,
gender,
age
})
);



window.location.href="chat.html";


}