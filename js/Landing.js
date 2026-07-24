/* Animated Counter */

const counters=document.querySelectorAll(".counter");

counters.forEach(counter=>{

const updateCounter=()=>{

const target=+counter.dataset.target;

const current=+counter.innerText;

const increment=Math.ceil(target/120);

if(current<target){

counter.innerText=current+increment;

setTimeout(updateCounter,15);

}else{

counter.innerText=target;

}

};

updateCounter();

});

/* Navbar */

const navbar=document.getElementById("navbar");

window.addEventListener("scroll",()=>{

navbar.style.background=

window.scrollY>80

? "rgba(0,0,0,.9)"

: "rgba(255,255,255,.08)";

});

/* Dark Mode */

document.getElementById("themeBtn").onclick=()=>{

document.body.classList.toggle("dark");

};// ==========================
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

});