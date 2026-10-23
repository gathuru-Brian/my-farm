const menuToggle =
document.getElementById("menu-toggle");

const navMenu =
document.getElementById("nav-menu");

if(menuToggle){
    menuToggle.addEventListener("click", () => {
        navMenu.classList.toggle("active");
    });
}
const form =
document.getElementById("contact-form");

if(form){

    form.addEventListener("submit", function(e){

        e.preventDefault();

        document.getElementById(
        "success-message"
        ).innerText =
        "Message sent successfully!";

        form.reset();

    });

}
// ==========================
// DARK MODE
// ==========================

const themeBtn = document.getElementById("theme-toggle");

const savedTheme = localStorage.getItem("theme");

if(savedTheme === "dark"){

    document.body.classList.add("dark");

    themeBtn.textContent="☀️";

}

themeBtn.addEventListener("click",()=>{

    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")){

        localStorage.setItem("theme","dark");

        themeBtn.textContent="☀️";

    }else{

        localStorage.setItem("theme","light");

        themeBtn.textContent="🌙";

    }

});/*==================================
SCROLL REVEAL
===================================*/

const reveals = document.querySelectorAll(".reveal");

function revealSections(){

    const windowHeight = window.innerHeight;

    reveals.forEach(section=>{

        const sectionTop = section.getBoundingClientRect().top;

        if(sectionTop < windowHeight - 120){

            section.classList.add("active");

        }

    });

}

window.addEventListener("scroll",revealSections);

revealSections();/*==================================
COUNTER ANIMATION
===================================*/

const counters=document.querySelectorAll(".counter");

counters.forEach(counter=>{

    const updateCounter=()=>{

        const target=+counter.dataset.target;

        const current=+counter.innerText;

        const increment=Math.ceil(target/100);

        if(current<target){

            counter.innerText=current+increment;

            setTimeout(updateCounter,20);

        }

        else{

            counter.innerText=target;

        }

    }

    updateCounter();

});/*==================================
STICKY NAVIGATION
===================================*/

const nav=document.querySelector("nav");

window.addEventListener("scroll",()=>{

    if(window.scrollY>80){

        nav.classList.add("scrolled");

    }

    else{

        nav.classList.remove("scrolled");

    }

});