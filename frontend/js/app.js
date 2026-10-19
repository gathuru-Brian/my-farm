/* =========================================================
   MODERN FARMS
   LANDING PAGE JAVASCRIPT
========================================================= */

"use strict";


document.addEventListener("DOMContentLoaded", function () {


    /* =====================================================
       NAVBAR
    ===================================================== */

    const navbar =
        document.getElementById("navbar");


    function updateNavbar() {

        if (!navbar) {
            return;
        }

        if (window.scrollY > 30) {

            navbar.classList.add("scrolled");

        } else {

            navbar.classList.remove("scrolled");

        }
    }


    updateNavbar();

    window.addEventListener(
        "scroll",
        updateNavbar,
        { passive: true }
    );


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    const mobileButton =
        document.getElementById("mobileMenuButton");

    const mobileMenu =
        document.getElementById("mobileMenu");


    if (mobileButton && mobileMenu) {

        mobileButton.addEventListener(
            "click",
            function () {

                const isOpen =
                    mobileMenu.classList.toggle("open");

                mobileButton.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );

            }
        );


        const mobileLinks =
            mobileMenu.querySelectorAll("a");


        mobileLinks.forEach(function (link) {

            link.addEventListener(
                "click",
                function () {

                    mobileMenu.classList.remove("open");

                    mobileButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }
            );

        });

    }


    /* =====================================================
       HERO VIDEO
    ===================================================== */

    const heroVideo =
        document.querySelector(".hero-video-main");


    if (heroVideo) {

        heroVideo.muted = true;

        const playVideo =
            heroVideo.play();


        if (playVideo !== undefined) {

            playVideo.catch(function () {

                console.log(
                    "Hero video autoplay was blocked."
                );

            });

        }

    }


    /* =====================================================
       ACTIVE NAVIGATION
    ===================================================== */

    const navLinks =
        document.querySelectorAll(
            ".desktop-nav .nav-link"
        );


    const sections =
        document.querySelectorAll(
            "section[id]"
        );


    const sectionObserver =
        new IntersectionObserver(
            function (entries) {

                entries.forEach(function (entry) {

                    if (!entry.isIntersecting) {
                        return;
                    }

                    const currentId =
                        entry.target.getAttribute("id");

                    navLinks.forEach(function (link) {

                        const href =
                            link.getAttribute("href");

                        link.classList.toggle(
                            "active",
                            href === "#" + currentId
                        );

                    });

                });

            },
            {
                rootMargin:
                    "-35% 0px -55% 0px"
            }
        );


    sections.forEach(function (section) {

        sectionObserver.observe(section);

    });


    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    const revealElements =
        document.querySelectorAll(".reveal");


    if ("IntersectionObserver" in window) {

        const revealObserver =
            new IntersectionObserver(
                function (entries, observer) {

                    entries.forEach(function (entry) {

                        if (!entry.isIntersecting) {
                            return;
                        }

                        entry.target.classList.add(
                            "visible"
                        );

                        observer.unobserve(
                            entry.target
                        );

                    });

                },
                {
                    threshold: 0.12
                }
            );


        revealElements.forEach(function (element) {

            revealObserver.observe(element);

        });

    } else {

        revealElements.forEach(function (element) {

            element.classList.add("visible");

        });

    }


    /* =====================================================
       STATISTICS COUNTERS
    ===================================================== */

    const counters =
        document.querySelectorAll(
            "[data-counter]"
        );


    function animateCounter(element) {

        if (
            element.dataset.animated === "true"
        ) {
            return;
        }

        element.dataset.animated = "true";


        const target =
            parseInt(
                element.dataset.counter,
                10
            ) || 0;


        const suffix =
            element.dataset.suffix || "";


        const duration = 1400;

        const startTime =
            performance.now();


        function updateCounter(currentTime) {

            const elapsed =
                currentTime - startTime;


            const progress =
                Math.min(
                    elapsed / duration,
                    1
                );


            const eased =
                1 - Math.pow(
                    1 - progress,
                    3
                );


            const currentValue =
                Math.floor(
                    target * eased
                );


            element.textContent =
                currentValue.toLocaleString() +
                suffix;


            if (progress < 1) {

                requestAnimationFrame(
                    updateCounter
                );

            } else {

                element.textContent =
                    target.toLocaleString() +
                    suffix;

            }

        }


        requestAnimationFrame(
            updateCounter
        );

    }


    const statsSection =
        document.querySelector(
            ".stats-section"
        );


    if (
        statsSection &&
        counters.length &&
        "IntersectionObserver" in window
    ) {

        const statsObserver =
            new IntersectionObserver(
                function (entries, observer) {

                    entries.forEach(function (entry) {

                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }


                        counters.forEach(
                            animateCounter
                        );


                        observer.unobserve(
                            entry.target
                        );

                    });

                },
                {
                    threshold: 0.35
                }
            );


        statsObserver.observe(
            statsSection
        );

    } else {

        counters.forEach(
            animateCounter
        );

    }


    /* =====================================================
       CONTACT FORM
    ===================================================== */

    const contactForm =
        document.getElementById(
            "contactForm"
        );


    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const message =
                    document.getElementById(
                        "contactFormMessage"
                    );


                const button =
                    contactForm.querySelector(
                        "button[type='submit']"
                    );


                if (!message || !button) {
                    return;
                }


                const buttonText =
                    button.querySelector(
                        ".button-text"
                    );


                const originalText =
                    buttonText
                        ? buttonText.textContent
                        : "Send Message";


                button.disabled = true;


                if (buttonText) {

                    buttonText.textContent =
                        "Sending...";

                }


                message.style.display =
                    "none";


                /*
                 * Frontend confirmation for now.
                 *
                 * Later this can be connected
                 * directly to the Flask API.
                 */

                setTimeout(function () {

                    contactForm.reset();


                    message.textContent =
                        "Thank you! Your message has been received. We will get back to you shortly.";


                    message.style.display =
                        "block";


                    if (buttonText) {

                        buttonText.textContent =
                            "Message Sent";

                    }


                    setTimeout(function () {

                        button.disabled = false;


                        if (buttonText) {

                            buttonText.textContent =
                                originalText;

                        }

                    }, 1800);


                }, 800);

            }
        );

    }


    /* =====================================================
       SMOOTH INTERNAL LINKS
    ===================================================== */

    document.querySelectorAll(
        'a[href^="#"]'
    ).forEach(function (link) {

        link.addEventListener(
            "click",
            function (event) {

                const targetId =
                    link.getAttribute("href");


                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }


                const target =
                    document.querySelector(
                        targetId
                    );


                if (!target) {
                    return;
                }


                event.preventDefault();


                const navbarHeight =
                    navbar
                        ? navbar.offsetHeight
                        : 0;


                const targetPosition =
                    target.getBoundingClientRect().top +
                    window.scrollY -
                    navbarHeight -
                    12;


                window.scrollTo({

                    top: targetPosition,

                    behavior: "smooth"

                });

            }
        );

    });


    /* =====================================================
       IMAGE ERROR HANDLING
    ===================================================== */

    document.querySelectorAll("img").forEach(
        function (image) {

            image.addEventListener(
                "error",
                function () {

                    image.style.background =
                        "#e8f0ea";

                    image.style.objectFit =
                        "contain";

                    image.alt =
                        "Modern Farms image";

                }
            );

        }
    );


    /* =====================================================
       ESCAPE CLOSES MOBILE MENU
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                mobileMenu &&
                mobileMenu.classList.contains("open")
            ) {

                mobileMenu.classList.remove(
                    "open"
                );

                if (mobileButton) {

                    mobileButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }

            }

        }
    );


    console.log(
        "Modern Farms landing page initialized successfully."
    );

});
