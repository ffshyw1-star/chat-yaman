/* ==========================================
   شات اليمن المطور
   app.js
========================================== */

// تأثير ظهور الصفحة
window.addEventListener("load", () => {
    document.body.classList.add("loaded");
});

// عناصر الأزرار
const guestBtn = document.querySelector(".guest");
const memberBtn = document.querySelector(".member");
const registerBtn = document.querySelector(".register");

// انتقال بين الصفحات
if (guestBtn) {
    guestBtn.addEventListener("click", (e) => {
        e.preventDefault();
        fadeTo("pages/guest.html");
    });
}

if (memberBtn) {
    memberBtn.addEventListener("click", (e) => {
        e.preventDefault();
        fadeTo("pages/login.html");
    });
}

if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        fadeTo("pages/register.html");
    });
}

// انتقال ناعم
function fadeTo(page) {

    document.body.style.opacity = "0";

    setTimeout(() => {

        window.location.href = page;

    }, 300);

}

// تأثير حركة البطاقات عند ظهورها
const cards = document.querySelectorAll(".card");

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.classList.add("show");

        }

    });

}, {

    threshold: 0.2

});

cards.forEach(card => observer.observe(card));

// زر العودة للأعلى
const topButton = document.createElement("button");

topButton.innerHTML = "⬆";

topButton.id = "scrollTop";

document.body.appendChild(topButton);

window.addEventListener("scroll", () => {

    if (window.scrollY > 300) {

        topButton.style.display = "block";

    } else {

        topButton.style.display = "none";

    }

});

topButton.onclick = () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

};

// رسالة ترحيب
console.log("مرحباً بك في شات اليمن المطور");

// السنة الحالية في الفوتر
const footer = document.querySelector("footer p");

if (footer) {

    footer.innerHTML = `© ${new Date().getFullYear()} شات اليمن المطور`;

}